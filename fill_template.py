#!/usr/bin/env python3
"""
fill_template.py v3 — XML direct manipulation
يعدّل النصوص داخل PPTX مباشرة بدون python-pptx
يحافظ على كل الصور والعلاقات والتصميم كما هو
"""
import sys, json, io, os, re, copy, zipfile
from datetime import datetime
from lxml import etree

NS = {
    'a':   'http://schemas.openxmlformats.org/drawingml/2006/main',
    'p':   'http://schemas.openxmlformats.org/presentationml/2006/main',
    'r':   'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}

def today_ar():
    d = datetime.now()
    months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    days   = ['الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد']
    return f"{days[d.weekday()]} {d.day} {months[d.month-1]} {d.year}"

def week_num():
    return datetime.now().isocalendar()[1]

def fmt_date(s):
    if not s: return ''
    try: return datetime.strptime(str(s)[:10],'%Y-%m-%d').strftime('%Y/%m/%d')
    except: return str(s)

def status_label(s):
    if not s: return '—'
    m = {'مكتملة':'أخضر ✓','مكتمل':'أخضر ✓','معتمدة':'أخضر ✓','معتمد':'أخضر ✓',
         'Completed':'أخضر ✓','Cleared':'أخضر ✓',
         'قيد التنفيذ':'أصفر','In Progress':'أصفر','تحت المتابعة':'أصفر',
         'معرضة للخطر':'أحمر ✗','معرض للخطر':'أحمر ✗','At Risk':'أحمر ✗','متأخرة':'أحمر ✗','متأخر':'أحمر ✗'}
    return m.get(s, s)

def is_done(s):
    return s in ['مكتملة','مكتمل','معتمدة','معتمد','Completed','Cleared']

def is_active(s):
    return s in ['قيد التنفيذ','In Progress','تحت المتابعة']

def is_risk(i):
    return i.get('type','') in ['risks','مخاطرة','مخاطر']

def get_track(tracks, tid):
    for t in tracks:
        if t.get('track') == tid or t.get('id') == tid:
            return t
    return {}

# ----------------------------------------------------------------
# قرأ نص shape من XML
# ----------------------------------------------------------------
def get_shape_text(sp_elem):
    parts = []
    for t in sp_elem.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}t'):
        if t.text:
            parts.append(t.text)
    return ''.join(parts)

# ----------------------------------------------------------------
# اكتب نص داخل shape — يعدّل أول run في أول paragraph فقط
# ويحافظ على كل التنسيقات
# ----------------------------------------------------------------
def set_shape_text(sp_elem, new_text):
    a = 'http://schemas.openxmlformats.org/drawingml/2006/main'
    p = 'http://schemas.openxmlformats.org/presentationml/2006/main'
    # txBody يمكن أن يكون في p namespace أو a namespace
    txBody = sp_elem.find(f'{{{p}}}txBody') or sp_elem.find(f'{{{a}}}txBody')
    if txBody is None:
        return

    new_text = str(new_text) if new_text is not None else '—'
    lines = new_text.split('\n')

    # احصل على كل paragraphs (في a namespace دائماً داخل txBody)
    paras = txBody.findall(f'{{{a}}}p')
    if not paras:
        paras = list(txBody)  # fallback
    if not paras:
        return

    # احفظ تنسيق أول run من أول paragraph كمرجع
    first_rPr = None
    first_pPr = None
    for para in paras:
        pPr = para.find(f'{{{a}}}pPr')
        if pPr is not None and first_pPr is None:
            first_pPr = copy.deepcopy(pPr)
        for r in para.findall(f'{{{a}}}r'):
            rPr = r.find(f'{{{a}}}rPr')
            if rPr is not None and first_rPr is None:
                first_rPr = copy.deepcopy(rPr)
            break
        if first_rPr:
            break

    # احذف كل paragraphs
    for p in paras:
        txBody.remove(p)

    # أنشئ paragraph جديد لكل سطر
    for line in lines:
        p_new = etree.SubElement(txBody, f'{{{a}}}p')
        if first_pPr is not None:
            p_new.insert(0, copy.deepcopy(first_pPr))
        r_new = etree.SubElement(p_new, f'{{{a}}}r')
        if first_rPr is not None:
            r_new.insert(0, copy.deepcopy(first_rPr))
        t_new = etree.SubElement(r_new, f'{{{a}}}t')
        t_new.text = line

# ----------------------------------------------------------------
# ابحث عن shape باسمه في XML
# ----------------------------------------------------------------
def find_shape_by_name(tree, name):
    # ابحث في كل الـ namespaces الممكنة
    for ns in [
        'http://schemas.openxmlformats.org/presentationml/2006/main',
        'http://schemas.openxmlformats.org/drawingml/2006/main',
    ]:
        for sp in tree.findall(f'.//{{{ns}}}sp'):
            # ابحث عن cNvPr في أي namespace
            for child in sp.iter():
                tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                if tag == 'cNvPr' and child.get('name') == name:
                    return sp
    return None

def S(tree, name, text):
    """اختصار: ابحث عن shape واكتب فيه"""
    sp = find_shape_by_name(tree, name)
    if sp:
        set_shape_text(sp, text)

# ----------------------------------------------------------------
# تعبئة شريحة comprehensive
# ----------------------------------------------------------------
def fill_comprehensive_slides(slides_xml, state):
    tracks = state.get('tracks', [])
    items  = state.get('items', [])
    done   = [i for i in items if is_done(i.get('status',''))]
    active = [i for i in items if is_active(i.get('status',''))]
    risks  = [i for i in items if is_risk(i) and not is_done(i.get('status',''))]
    overall = round(sum(t.get('progress',0) for t in tracks)/len(tracks)) if tracks else 0
    worst   = 'أحمر' if any(t.get('status','') in ['معرض للخطر','معرضة للخطر','At Risk'] for t in tracks) \
              else 'أصفر' if any(t.get('status','') in ['تحت المتابعة'] for t in tracks) else 'أخضر'

    # Slide 1 — الغلاف
    s1 = slides_xml[0]
    S(s1,'Text 4', f"الأسبوع {week_num()} — {datetime.now().year} | الفترة: {today_ar()}")

    # Slide 2 — الملخص التنفيذي
    s2 = slides_xml[1]
    S(s2,'Text 17', f"الحالة: {worst}\nنسبة إنجاز اليوم: {overall}٪")
    done_t = [i.get('title','') for i in done[:3]]
    while len(done_t)<3: done_t.append('—')
    S(s2,'Text 21', '\n'.join(done_t))
    active_t = [i.get('title','') for i in active[:3]]
    while len(active_t)<3: active_t.append('—')
    S(s2,'Text 25', '\n'.join(active_t))
    # جدول القضايا
    issue_map = [
        ('Shape 51','Text 50','Text 48','Text 46','Text 44'),
        ('Text 62', 'Text 60','Text 58','Text 56','Text 54'),
        ('Text 72', 'Text 70','Text 68','Text 66','Text 64'),
    ]
    for idx,(nq,aq,iq,mq,wq) in enumerate(issue_map):
        if idx < len(risks):
            r = risks[idx]
            S(s2,nq, r.get('title','—'))
            S(s2,mq, r.get('owner','—'))
            S(s2,wq, fmt_date(r.get('due','')))
            S(s2,iq, 'متابعة عاجلة')
            S(s2,aq, 'تأثير على الجدول')

    # Slide 3 — حالة المسارات
    s3 = slides_xml[2]
    track_rows = [
        ('Text 34','Text 32','Text 30','Text 28','Text 26','Text 24'),
        ('Text 46','Text 44','Text 42','Text 40','Text 38','Text 36'),
        ('Text 58','Text 56','Text 54','Text 52','Text 50','Text 48'),
        ('Text 70','Text 68','Text 66','Text 64','Text 62','Text 60'),
    ]
    for tidx,(nm,s_done,s_today,s_tmr,s_status,s_support) in enumerate(track_rows):
        tid = ['أ','ب','ج','د'][tidx]
        t   = get_track(tracks, tid)
        ti  = [i for i in items if i.get('track')==tid]
        tdone  = [i for i in ti if is_done(i.get('status',''))]
        tact   = [i for i in ti if is_active(i.get('status',''))]
        tnext  = sorted([i for i in ti if not is_done(i.get('status','')) and not is_active(i.get('status','')) and i.get('due')], key=lambda x:x.get('due',''))
        trisks = [i for i in ti if is_risk(i) and not is_done(i.get('status',''))]
        S(s3,s_done,   tdone[0].get('title','—') if tdone else '—')
        S(s3,s_today,  tact[0].get('title','—') if tact else '—')
        S(s3,s_tmr,    tnext[0].get('title','—') if tnext else '—')
        S(s3,s_status, status_label(t.get('status','')))
        S(s3,s_support,f"{len(trisks)} مخاطر مفتوحة" if trisks else 'لا يوجد')

    # Slide 5 — المخاطر
    s5 = slides_xml[4]
    red_r = [r for r in risks if r.get('status','') in ['معرضة للخطر','معرض للخطر','At Risk']]
    yel_r = [r for r in risks if r.get('status','') in ['تحت المتابعة','قيد التنفيذ']]
    if red_r:
        r=red_r[0]; S(s5,'Text 28',r.get('title','—')); S(s5,'Text 22',r.get('owner','—')); S(s5,'Text 24',fmt_date(r.get('due','')))
    if yel_r:
        r=yel_r[0]; S(s5,'Text 38',r.get('title','—')); S(s5,'Text 32',r.get('owner','—')); S(s5,'Text 34',fmt_date(r.get('due','')))
    if len(risks)>1:
        r=risks[1]; S(s5,'Text 48',r.get('title','—')); S(s5,'Text 42',r.get('owner','—')); S(s5,'Text 44',fmt_date(r.get('due','')))
    for idx,(sq,dq,aq,iq) in enumerate([('Text 69','Text 67','Text 65','Text 63'),('Text 77','Text 75','Text 73','Text 71'),('Text 85','Text 83','Text 81','Text 79')]):
        if idx<len(risks):
            r=risks[idx]; S(s5,sq,r.get('title','—')); S(s5,dq,r.get('title','—')); S(s5,aq,'متابعة عاجلة'); S(s5,iq,status_label(r.get('status','')))

    # Slide 6 — الجدول الزمني
    s6 = slides_xml[5]
    tasks = [i for i in items if not is_risk(i)]
    t_done   = [i for i in tasks if is_done(i.get('status',''))][:3]
    t_active = [i for i in tasks if is_active(i.get('status',''))][:3]
    t_next   = sorted([i for i in tasks if not is_done(i.get('status','')) and not is_active(i.get('status','')) and i.get('due')], key=lambda x:x.get('due',''))[:3]
    fmt = lambda arr: '\n'.join(f"• {i.get('title','')}" for i in arr) or '• لا يوجد'
    S(s6,'Text 42', fmt(t_done))
    S(s6,'Text 31', fmt(t_active))
    S(s6,'Text 20', fmt(t_next))

# ----------------------------------------------------------------
# تعبئة شريحة track
# ----------------------------------------------------------------
def fill_track_slides(slides_xml, state, track_id):
    tracks = state.get('tracks', [])
    items  = state.get('items', [])
    track  = get_track(tracks, track_id)
    ti     = [i for i in items if i.get('track')==track_id]
    tdone  = [i for i in ti if is_done(i.get('status',''))]
    tact   = [i for i in ti if is_active(i.get('status',''))]
    tnext  = sorted([i for i in ti if not is_done(i.get('status','')) and not is_active(i.get('status','')) and i.get('due')], key=lambda x:x.get('due',''))
    trisks = [i for i in ti if is_risk(i) and not is_done(i.get('status',''))]
    all8   = (tdone+tact+tnext)[:8]

    # Slide 2 — الملخص
    s2 = slides_xml[1]
    S(s2,'Text 12', f"الحالة المختارة: {status_label(track.get('status',''))}\nنسبة إنجاز اليوم: {track.get('progress',0)}٪")
    done_t = [i.get('title','') for i in tdone[:3]]
    while len(done_t)<3: done_t.append('—')
    S(s2,'Text 15', '\n'.join(done_t))
    S(s2,'Text 18', (trisks[0].get('title','لا يوجد') + '\nآخر موعد: ' + fmt_date(trisks[0].get('due',''))) if trisks else 'لا يوجد طلبات دعم')

    # جدول التحديث التفصيلي
    det_rows = [
        ('Text 44','Text 40','Text 38','Text 36','Text 34'),
        ('Text 56','Text 52','Text 50','Text 48','Text 46'),
        ('Text 68','Text 64','Text 62','Text 60','Text 58'),
        ('Text 80','Text 76','Text 74','Text 72','Text 70'),
    ]
    all_items = tdone+tact+tnext
    for ri,(_,s_done,s_act,s_plan,_) in enumerate(det_rows):
        b = ri*2
        i_done = all_items[b]   if b<len(all_items)   else None
        i_act  = all_items[b+1] if b+1<len(all_items) else None
        S(s2, s_done, i_done.get('title','—') if i_done else '—')
        S(s2, s_act,  i_act.get('title','—')  if i_act  else '—')
        S(s2, s_plan, '—')

    # Slide 3 — الأنشطة
    s3 = slides_xml[2]
    act_shapes = [
        ('Text 35','Text 33','Text 31','Text 27','Text 25'),
        ('Text 51','Text 49','Text 47','Text 43','Text 41'),
        ('Text 67','Text 65','Text 63','Text 59','Text 57'),
        ('Text 83','Text 81','Text 79','Text 75','Text 73'),
        ('Text 99','Text 97','Text 95','Text 91','Text 89'),
        ('Text 115','Text 113','Text 111','Text 107','Text 105'),
        ('Text 131','Text 129','Text 127','Text 123','Text 121'),
        ('Text 147','Text 145','Text 143','Text 139','Text 137'),
    ]
    for idx,(t_title,t_owner,t_due,t_status,t_pct) in enumerate(act_shapes):
        if idx<len(all8):
            item=all8[idx]
            S(s3,t_title,  item.get('title','—'))
            S(s3,t_owner,  item.get('owner','—'))
            S(s3,t_due,    fmt_date(item.get('due','')))
            S(s3,t_status, status_label(item.get('status','')))
            S(s3,t_pct,    f"{item.get('progress',0)}٪")
        else:
            S(s3,t_title,'—'); S(s3,t_owner,''); S(s3,t_due,''); S(s3,t_status,''); S(s3,t_pct,'')

    # Slide 4 — المخاطر
    s4 = slides_xml[3]
    red_r = [r for r in trisks if r.get('status','') in ['معرضة للخطر','معرض للخطر','At Risk']]
    yel_r = [r for r in trisks if r.get('status','') in ['تحت المتابعة','قيد التنفيذ']]
    if red_r:
        r=red_r[0]; S(s4,'Text 28',r.get('title','—')); S(s4,'Text 19',r.get('owner','—')); S(s4,'Text 21',fmt_date(r.get('due','')))
    if yel_r:
        r=yel_r[0]; S(s4,'Text 38',r.get('title','—')); S(s4,'Text 31',r.get('owner','—')); S(s4,'Text 33',fmt_date(r.get('due','')))
    if trisks:
        r=trisks[0]; S(s4,'Text 48',r.get('title','—')); S(s4,'Text 43',r.get('owner','—')); S(s4,'Text 45',fmt_date(r.get('due','')))
    for idx,(sq,dq,aq,iq) in enumerate([('Text 69','Text 67','Text 65','Text 63'),('Text 77','Text 75','Text 73','Text 71'),('Text 85','Text 83','Text 81','Text 79')]):
        if idx<len(trisks):
            r=trisks[idx]; S(s4,sq,r.get('title','—')); S(s4,dq,r.get('title','—')); S(s4,aq,'متابعة عاجلة'); S(s4,iq,status_label(r.get('status','')))

    # Slide 6 — الجدول الزمني
    s6 = slides_xml[5]
    fmt = lambda arr: '\n'.join(f"• {i.get('title','')}" for i in arr) or '• لا يوجد'
    S(s6,'Text 33', fmt(tdone[:3]))
    S(s6,'Text 24', fmt(tact[:3]))
    S(s6,'Text 15', fmt(tnext[:3]))

# ----------------------------------------------------------------
# Main — يعالج الـ PPTX كـ ZIP مباشرة
# ----------------------------------------------------------------
def main():
    data = json.loads(sys.stdin.read())
    report_type = data['type']
    state       = data['state']
    tpl_dir     = data.get('tpl_dir', 'templates')

    tpl_map = {
        'comprehensive': 'comprehensive.pptx',
        'أ': 'track-a.pptx',
        'ب': 'track-b.pptx',
        'ج': 'track-c.pptx',
        'د': 'track-d.pptx',
    }
    tpl_file = tpl_map.get(report_type)
    if not tpl_file:
        sys.stderr.write(f"نوع تقرير غير معروف: {report_type}\n"); sys.exit(1)

    tpl_path = os.path.join(tpl_dir, tpl_file)

    # افتح الـ PPTX كـ ZIP، اقرأ كل ملف، عدّل الـ slides XML فقط
    in_buf  = io.BytesIO(open(tpl_path,'rb').read())
    out_buf = io.BytesIO()

    with zipfile.ZipFile(in_buf,'r') as zin, zipfile.ZipFile(out_buf,'w',zipfile.ZIP_DEFLATED) as zout:
        # احصل على قائمة الـ slides
        slide_files = sorted(
            [f for f in zin.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', f)],
            key=lambda f: int(re.search(r'\d+', f.split('/')[-1]).group())
        )

        # حلّل XML لكل slide
        slides_xml = []
        for sf in slide_files:
            xml_bytes = zin.read(sf)
            tree = etree.fromstring(xml_bytes)
            slides_xml.append(tree)

        # عبّئ البيانات
        if report_type == 'comprehensive':
            fill_comprehensive_slides(slides_xml, state)
        else:
            fill_track_slides(slides_xml, state, report_type)

        # اكتب كل ملفات الـ ZIP — الـ slides المعدّلة والباقي كما هو
        slide_map = {sf: slides_xml[i] for i, sf in enumerate(slide_files)}

        for item in zin.infolist():
            if item.filename in slide_map:
                # اكتب XML المعدّل
                new_xml = etree.tostring(slide_map[item.filename], xml_declaration=True, encoding='UTF-8', standalone=True)
                zout.writestr(item, new_xml)
            else:
                # انسخ الملف كما هو بدون أي تعديل
                zout.writestr(item, zin.read(item.filename))

    sys.stdout.buffer.write(out_buf.getvalue())

if __name__ == '__main__':
    main()
