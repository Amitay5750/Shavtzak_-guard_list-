let isScheduleGenerated = false;
let globalSoldiers = [];
let globalPositions = [];
let globalExceptions = []; 

let globalSchedule = []; 
let globalStats = {}; 

let editingSoldierId = null;
let editingPositionId = null;

const MIN_REST_MS = 2 * 60 * 60 * 1000; 
const DRIVER_SLEEP_MS = 6 * 60 * 60 * 1000; 

function calculateNightMs(startMs, endMs) {
    let nightMs = 0;
    let cur = new Date(startMs);
    while (cur.getTime() < endMs) {
        let h = cur.getHours();
        if (h >= 0 && h < 6) {
            nightMs += 3600000; 
        }
        cur = new Date(cur.getTime() + 3600000);
    }
    return nightMs;
}

window.onload = () => {
    const now = new Date();
    const start = new Date(now.setHours(8, 0, 0, 0));
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const startInput = document.getElementById('start-time');
    const endInput = document.getElementById('end-time');
    const excStartInput = document.getElementById('exception-start');
    const excEndInput = document.getElementById('exception-end');
    
    if(startInput) startInput.value = start.toISOString().slice(0, 16);
    if(endInput) endInput.value = end.toISOString().slice(0, 16);
    if(excStartInput) excStartInput.value = start.toISOString().slice(0, 16);
    if(excEndInput) excEndInput.value = new Date(start.getTime() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16); 
    
    document.getElementById('soldier-name')?.addEventListener('keypress', e => { if (e.key === 'Enter') saveSoldier(); });
    document.getElementById('position-name')?.addEventListener('keypress', e => { if (e.key === 'Enter') savePosition(); });
    document.getElementById('position-duration')?.addEventListener('keypress', e => { if (e.key === 'Enter') savePosition(); });
    document.getElementById('position-req-soldiers')?.addEventListener('keypress', e => { if (e.key === 'Enter') savePosition(); });
    
    loadDataFromStorage();
};

function showSection(id) {
    document.getElementById('schedule-section').style.display = id === 'schedule' ? 'block' : 'none';
    document.getElementById('admin-section').style.display = id === 'admin' ? 'block' : 'none';
    document.getElementById('report-section').style.display = id === 'report' ? 'block' : 'none';
    document.getElementById('control-section').style.display = id === 'control' ? 'block' : 'none';
    
    document.getElementById('nav-schedule').classList.toggle('active', id === 'schedule');
    document.getElementById('nav-admin').classList.toggle('active', id === 'admin');
    document.getElementById('nav-report').classList.toggle('active', id === 'report');
    document.getElementById('nav-control').classList.toggle('active', id === 'control');

    if (id === 'control' && isScheduleGenerated) {
        populateControlTab();
    }
}

function loadDataFromStorage() {
    const savedSoldiers = localStorage.getItem('soldiersData');
    const savedPositions = localStorage.getItem('positionsData');
    const savedExceptions = localStorage.getItem('exceptionsData');
    const savedSchedule = localStorage.getItem('scheduleData');

    if (savedSoldiers) globalSoldiers = JSON.parse(savedSoldiers);
    if (savedPositions) globalPositions = JSON.parse(savedPositions);
    if (savedExceptions) globalExceptions = JSON.parse(savedExceptions);
    if (savedSchedule) {
        globalSchedule = JSON.parse(savedSchedule);
        isScheduleGenerated = true;
        recalculateStats();
    }
    updateUI();
}

function saveDataToStorage() {
    localStorage.setItem('soldiersData', JSON.stringify(globalSoldiers));
    localStorage.setItem('positionsData', JSON.stringify(globalPositions));
    localStorage.setItem('exceptionsData', JSON.stringify(globalExceptions));
    if (isScheduleGenerated) {
        localStorage.setItem('scheduleData', JSON.stringify(globalSchedule));
    } else {
        localStorage.removeItem('scheduleData');
    }
}

function updateUI() {
    const totalSoldiersEl = document.getElementById('total-soldiers');
    const totalPositionsEl = document.getElementById('total-positions');
    if (totalSoldiersEl) totalSoldiersEl.innerText = globalSoldiers.length;
    if (totalPositionsEl) totalPositionsEl.innerText = globalPositions.length;

    const sList = document.getElementById('admin-soldiers-list');
    const excSoldierSelect = document.getElementById('exception-soldier');
    const repSoldierSelect = document.getElementById('report-soldier-select'); 
    
    if (sList && excSoldierSelect && repSoldierSelect) {
        excSoldierSelect.innerHTML = '<option value="">בחר חייל...</option>';
        repSoldierSelect.innerHTML = '<option value="">בחר חייל...</option>';
        
        if (globalSoldiers.length === 0) {
            sList.innerHTML = '<li style="color: #95a5a6; font-style: italic;">אין חיילים במערכת</li>';
        } else {
            sList.innerHTML = globalSoldiers.map((s, idx) => {
                let driverTag = s.isDriver ? ' <span style="color:#2980b9; font-size:0.85em; font-weight:bold;">[נהג]</span>' : '';
                return `<li><span style="display:inline-block; width:20px; font-weight:bold;">${idx + 1}.</span> ${s.name} ${driverTag} 
                    <div style="margin-right:auto; display:flex; gap:5px;">
                        <button onclick="editSoldier(${s.id})" style="background:none; color:#f39c12; border:none; padding:0 5px; font-size:0.9em; cursor:pointer;">(ערוך)</button>
                        <button onclick="deleteSoldier(${s.id})" style="background:none; color:red; border:none; padding:0 5px; font-size:0.9em; cursor:pointer;">(הסר)</button>
                    </div>
                </li>`;
            }).join('');
            globalSoldiers.forEach(s => {
                excSoldierSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
                repSoldierSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
            });
        }
    }

    const pList = document.getElementById('admin-positions-list');
    if (pList) {
        if (globalPositions.length === 0) pList.innerHTML = '<li style="color: #95a5a6; font-style: italic;">אין עמדות במערכת</li>';
        else {
            pList.innerHTML = globalPositions.map((p, idx) => {
                let driverTag = p.reqDriver ? ' <span style="color:#2980b9; font-size:0.85em; font-weight:bold;">[דורש נהג]</span>' : '';
                return `<li><span style="display:inline-block; width:20px; font-weight:bold;">${idx + 1}.</span> ${p.name} ${driverTag} <span style="color:#7f8c8d; font-size:0.9em; margin-right:5px;">(${p.duration} שעות | ${p.reqSoldiers} חיילים)</span> 
                    <div style="margin-right:auto; display:flex; gap:5px;">
                        <button onclick="editPosition(${p.id})" style="background:none; color:#f39c12; border:none; padding:0 5px; font-size:0.9em; cursor:pointer;">(ערוך)</button>
                        <button onclick="deletePosition(${p.id})" style="background:none; color:red; border:none; padding:0 5px; font-size:0.9em; cursor:pointer;">(הסר)</button>
                    </div>
                </li>`;
            }).join('');
        }
    }

    const eList = document.getElementById('admin-exceptions-list');
    if (eList) {
        if (globalExceptions.length === 0) eList.innerHTML = '<li style="color: #95a5a6; font-style: italic;">אין חריגים במערכת</li>';
        else eList.innerHTML = globalExceptions.map((e, index) => {
            let startD = new Date(e.startMs);
            let endD = new Date(e.endMs);
            let tStr = `${startD.getDate()}/${startD.getMonth()+1} ${startD.getHours().toString().padStart(2,'0')}:${startD.getMinutes().toString().padStart(2,'0')} - ${endD.getHours().toString().padStart(2,'0')}:${endD.getMinutes().toString().padStart(2,'0')}`;
            return `<li><span style="display:inline-block; width:20px; font-weight:bold;">${index + 1}.</span> <strong>${e.soldierName}</strong>: ${e.type} <span style="color:#7f8c8d; font-size:0.9em; margin-right:10px;" dir="ltr">${tStr}</span> <button onclick="deleteException(${e.id})" style="background:none; color:red; border:none; padding:0 10px; font-size:0.9em; cursor:pointer; margin-right:auto;">(הסר)</button></li>`;
        }).join('');
    }

    if (isScheduleGenerated) {
        renderTable();
        populateControlTab();
    }
}

function editSoldier(id) {
    const soldier = globalSoldiers.find(s => s.id === id);
    if (!soldier) return;
    document.getElementById('soldier-name').value = soldier.name;
    document.getElementById('soldier-is-driver').checked = soldier.isDriver;
    editingSoldierId = id;
    
    const btn = document.getElementById('btn-save-soldier');
    if(btn) { btn.innerText = 'שמור שינויים'; btn.style.background = '#f39c12'; }
}

function saveSoldier() {
    const input = document.getElementById('soldier-name');
    const isDriverInput = document.getElementById('soldier-is-driver');
    const val = input.value.trim();
    if (!val) return;
    
    if (editingSoldierId) {
        if (globalSoldiers.some(s => s.name === val && s.id !== editingSoldierId)) return alert("שגיאה: חייל בשם הזה כבר קיים במערכת!");
        let soldier = globalSoldiers.find(s => s.id === editingSoldierId);
        let oldName = soldier.name;
        soldier.name = val;
        soldier.isDriver = isDriverInput.checked;
        
        if (oldName !== val) {
            globalExceptions.forEach(e => { if (e.soldierName === oldName) e.soldierName = val; });
            isScheduleGenerated = false; 
        } else if (soldier.isDriver !== isDriverInput.checked) {
            isScheduleGenerated = false; 
        }
        
        editingSoldierId = null;
        const btn = document.getElementById('btn-save-soldier');
        if(btn) { btn.innerText = 'הוסף'; btn.style.background = ''; }
    } else {
        if (globalSoldiers.some(s => s.name === val)) return alert("שגיאה: חייל בשם הזה כבר קיים במערכת!");
        globalSoldiers.push({ id: Date.now(), name: val, isDriver: isDriverInput.checked });
        isScheduleGenerated = false;
    }
    
    saveDataToStorage(); input.value = ''; isDriverInput.checked = false; updateUI(); input.focus();
}

function deleteSoldier(id) {
    const soldierToDelete = globalSoldiers.find(s => s.id === id);
    if (soldierToDelete) globalExceptions = globalExceptions.filter(e => e.soldierName !== soldierToDelete.name);
    globalSoldiers = globalSoldiers.filter(s => s.id !== id);
    saveDataToStorage(); isScheduleGenerated = false; updateUI();
}

function editPosition(id) {
    const pos = globalPositions.find(p => p.id === id);
    if (!pos) return;
    document.getElementById('position-name').value = pos.name;
    document.getElementById('position-duration').value = pos.duration;
    document.getElementById('position-req-soldiers').value = pos.reqSoldiers;
    document.getElementById('position-req-driver').checked = pos.reqDriver;
    editingPositionId = id;
    
    const btn = document.getElementById('btn-save-position');
    if(btn) { btn.innerText = 'שמור שינויים'; btn.style.background = '#f39c12'; }
}

function savePosition() {
    const nameInput = document.getElementById('position-name');
    const durInput = document.getElementById('position-duration');
    const reqInput = document.getElementById('position-req-soldiers');
    const reqDriverInput = document.getElementById('position-req-driver');
    
    const name = nameInput.value.trim();
    const dur = parseInt(durInput.value.trim() || "4"); 
    const req = parseInt(reqInput.value.trim() || "1"); 
    
    if (!name) return;
    
    if (editingPositionId) {
        let pos = globalPositions.find(p => p.id === editingPositionId);
        pos.name = name; pos.duration = dur; pos.reqSoldiers = req; pos.reqDriver = reqDriverInput.checked;
        editingPositionId = null;
        const btn = document.getElementById('btn-save-position');
        if(btn) { btn.innerText = 'הוסף משימה'; btn.style.background = ''; }
    } else {
        globalPositions.push({ id: Date.now(), name: name, duration: dur, reqSoldiers: req, reqDriver: reqDriverInput.checked });
    }
    
    saveDataToStorage(); nameInput.value = ''; durInput.value = ''; reqInput.value = ''; reqDriverInput.checked = false;
    isScheduleGenerated = false; updateUI(); nameInput.focus();
}

function deletePosition(id) {
    globalPositions = globalPositions.filter(p => p.id !== id);
    saveDataToStorage(); isScheduleGenerated = false; updateUI();
}

function addException() {
    const soldier = document.getElementById('exception-soldier').value;
    const type = document.getElementById('exception-type').value;
    const startStr = document.getElementById('exception-start').value;
    const endStr = document.getElementById('exception-end').value;

    if (!soldier || !startStr || !endStr) return alert("נא למלא את כל השדות להוספת חריגה.");

    const startMs = new Date(startStr).getTime(); const endMs = new Date(endStr).getTime();
    if (startMs >= endMs) return alert("זמן סיום חייב להיות אחרי זמן התחלה.");

    globalExceptions.push({ id: Date.now(), soldierName: soldier, type: type, startMs: startMs, endMs: endMs });
    saveDataToStorage(); isScheduleGenerated = false; updateUI();
}

function deleteException(id) {
    globalExceptions = globalExceptions.filter(e => e.id !== id);
    saveDataToStorage(); isScheduleGenerated = false; updateUI();
}

function resetSystem() {
    if (confirm("פעולה זו תמחק לחלוטין את כל הנתונים. האם להמשיך?")) {
        globalSoldiers = []; globalPositions = []; globalExceptions = []; globalSchedule = [];
        editingSoldierId = null; editingPositionId = null;
        localStorage.clear(); isScheduleGenerated = false; updateUI();
    }
}

// ---------------- יועץ תכנון חכם משודרג ----------------
function openAdvisor() {
    let driversCount = globalSoldiers.filter(s => s.isDriver).length;
    let totalSoldiers = globalSoldiers.length;
    
    let totalReqSoldiers = 0;
    let driverPositions = 0;
    globalPositions.forEach(p => {
        totalReqSoldiers += p.reqSoldiers;
        if (p.reqDriver) driverPositions++;
    });

    let content = `<h3 style="color:#2c3e50;">📐 כללי ברזל לתכנון מתמטי (מניעת 'חורים' בלוח)</h3>`;
    content += `<p style="background:#eafaf1; padding:10px; border-radius:6px; font-size:0.95em;">
        היממה מורכבת מ-24 שעות. כדי שהלוח ירוץ בצורה חלקה ולחיילים לא יווצרו שברים ושאריות שמקפיצים אותם שוב ושוב לעמדות, 
        <strong>משך כל משמרת חייב להיות מספר שמתחלק ב-24 ללא שארית</strong>. <br>
        האורכים האידיאליים היחידים האפשריים הם: <strong>2, 3, 4, 6 או 8 שעות.</strong>
    </p>`;

    content += `<h3 style="color:#2c3e50; margin-top:25px;">🚗 ניתוח משימות נהיגה בהתאמה אישית</h3>`;
    if (driverPositions === 0) {
        content += `<p style="color:#7f8c8d;">לא הוגדרו עמדות הדורשות נהג. הסד"כ חופשי מאילוצי נהיגה.</p>`;
    } else {
        if (driversCount === 0) {
            content += `<p style="color:#e74c3c; font-weight:bold;">🚨 שגיאה קריטית: יש עמדת נהיגה, אבל 0 נהגים במצבה!</p>`;
        } else if (driversCount === 1) {
            content += `<p style="color:#e74c3c; font-weight:bold;">🚨 התראה חמורה: נהג יחיד לא יכול להחזיק משימה 24/7 (חייב 6 שעות שינה).</p>`;
        } else {
            // המלצה מתמטית מחושבת לנהגים
            let idealDriverShift = 24 / driversCount;
            let possibleShifts = [];
            if (24 % driversCount === 0 && idealDriverShift >= 2 && idealDriverShift <= 8) {
                content += `<p style="color:#27ae60;">✅ יש לך ${driversCount} נהגים. כדי לייצר סבב נהיגה מושלם (שבו כל נהג עולה פעם ביום ומקבל מקסימום מנוחה רצופה), <strong>הגדר את משמרת הסיור ל-${idealDriverShift} שעות בדיוק.</strong></p>`;
            } else {
                content += `<p style="color:#e67e22;">⚠️ יש לך ${driversCount} נהגים. 24 לא מתחלק ב-${driversCount} בצורה מושלמת. מומלץ להשתמש במשמרות של <strong>4 או 3 שעות</strong> ולהיות מוכן לכך שנהגים ישובצו פעמיים ביממה (אך המערכת תגן על 6 שעות השינה שלהם).</p>`;
            }
        }
    }

    content += `<h3 style="color:#2c3e50; margin-top:25px;">🛡️ ניתוח עומס והמלצות לשומרים רגילים</h3>`;
    if (totalSoldiers === 0 || totalReqSoldiers === 0) {
        content += `<p style="color:#7f8c8d;">חסרים נתונים לחישוב עומס כולל.</p>`;
    } else {
        let totalHoursNeeded = totalReqSoldiers * 24;
        let avgHours = totalHoursNeeded / totalSoldiers;
        
        content += `<ul style="list-style-type: square; color:#34495e;">
            <li>נדרשות <strong>${totalHoursNeeded}</strong> שעות איוש בכל יממה (על ${totalSoldiers} חיילים פנויים).</li>
            <li>ממוצע מוערך: <strong style="font-size:1.2em;">${avgHours.toFixed(1)} שעות שמירה לחייל</strong> ביממה.</li>
        </ul>`;
        
        if (avgHours > 10) {
            content += `<div style="background:#fadbd8; padding:15px; border-radius:6px; margin-top:10px;">
                <span style="color:#c0392b; font-weight:bold;">🚨 עומס כבד ובלתי אפשרי! (מעל 10 שעות לחייל)</span><br>
                החיילים יקרסו ולא יקבלו מספיק מנוחה. חובה לבטל עמדה או לגייס סד"כ נוסף.
            </div>`;
        } else if (avgHours > 7) {
            content += `<div style="background:#fdebd0; padding:15px; border-radius:6px; margin-top:10px;">
                <span style="color:#d35400; font-weight:bold;">⚠️ עומס בינוני-גבוה.</span><br>
                <strong>המלצת המערכת:</strong> קבע משמרות ארוכות יותר של <strong>4 או 6 שעות</strong>. אם תקבע שעתיים, החיילים יתזזצו לעלות ולרדת מעמדות 4-5 פעמים ביום וייחנקו.
            </div>`;
        } else {
            content += `<div style="background:#d5f5e3; padding:15px; border-radius:6px; margin-top:10px;">
                <span style="color:#27ae60; font-weight:bold;">✅ עומס תקין ומרווח.</span><br>
                <strong>המלצת המערכת:</strong> קבע משמרות של <strong>2 או 3 שעות</strong> כדי לאזן נטל ולהעביר את הזמן מהר.
            </div>`;
        }
    }

    document.getElementById('advisor-content').innerHTML = content;
    document.getElementById('advisor-modal').style.display = 'flex';
}

function closeAdvisor() {
    document.getElementById('advisor-modal').style.display = 'none';
}

// ---------------- מנוע בניית הלוח החדש - עם מנגנון מניעת פערים! ----------------
function generateSchedule() {
    if (globalSoldiers.length === 0 || globalPositions.length === 0) return alert("יש להזין לפחות חייל אחד ועמדה אחת כדי לבצע שיבוץ.");

    const startInput = document.getElementById('start-time');
    const endInput = document.getElementById('end-time');
    const start = new Date(startInput ? startInput.value : new Date());
    const end = new Date(endInput ? endInput.value : new Date().getTime() + 86400000);

    globalSchedule = []; 
    
    globalPositions.forEach(pos => {
        let cur = new Date(start);
        while (cur < end) {
            let next = new Date(cur.getTime() + pos.duration * 60 * 60 * 1000);
            if (next > end) next = end;
            
            globalSchedule.push({
                id: pos.id + '_' + cur.getTime(), 
                posId: pos.id,
                posName: pos.name,
                startMs: cur.getTime(),
                endMs: next.getTime(),
                durationHours: Math.round((next - cur) / 3600000),
                reqSoldiers: pos.reqSoldiers,
                reqDriver: pos.reqDriver,
                soldiers: [] 
            });
            cur = next;
        }
    });

    globalSchedule.sort((a, b) => a.startMs - b.startMs);

    let tempAssignments = {};
    globalSoldiers.forEach(s => { tempAssignments[s.name] = []; });
    let tempStats = {};
    globalSoldiers.forEach(s => { tempStats[s.name] = { totalMs: 0, nightMs: 0, lastEnd: 0 }; });

    globalSchedule.forEach(shift => {
        let shiftNightMs = calculateNightMs(shift.startMs, shift.endMs);
        
        for (let slot = 0; slot < shift.reqSoldiers; slot++) {
            let isDriverRequiredForThisSlot = (shift.reqDriver && slot === 0); 
            let tempValid = [];
            
            globalSoldiers.forEach(soldier => {
                let candidate = soldier.name;
                if (isDriverRequiredForThisSlot && !soldier.isDriver) return;
                if (shift.soldiers.includes(candidate)) return;

                let isExcluded = false;
                for (let exc of globalExceptions) {
                    if (exc.soldierName === candidate && Math.max(shift.startMs, exc.startMs) < Math.min(shift.endMs, exc.endMs)) {
                        isExcluded = true; break;
                    }
                }
                if (isExcluded) return; 

                let hasSufficientRest = true;
                for (let existingShift of tempAssignments[candidate]) {
                    if (Math.max(shift.startMs, existingShift.start - MIN_REST_MS) < Math.min(shift.endMs, existingShift.end + MIN_REST_MS)) {
                        hasSufficientRest = false; break;
                    }
                }
                if (hasSufficientRest) {
                    for (let exc of globalExceptions) {
                        if (exc.soldierName === candidate && Math.max(shift.startMs, exc.startMs - MIN_REST_MS) < Math.min(shift.endMs, exc.endMs + MIN_REST_MS)) {
                            hasSufficientRest = false; break;
                        }
                    }
                }
                
                if (hasSufficientRest && isDriverRequiredForThisSlot) {
                    for (let existingShift of tempAssignments[candidate]) {
                        if (Math.max(shift.startMs - DRIVER_SLEEP_MS, existingShift.start) < Math.min(shift.startMs, existingShift.end)) {
                            hasSufficientRest = false; break;
                        }
                    }
                    if (hasSufficientRest) {
                        for (let exc of globalExceptions) {
                            if (exc.soldierName === candidate && Math.max(shift.startMs - DRIVER_SLEEP_MS, exc.startMs) < Math.min(shift.startMs, exc.endMs)) {
                                hasSufficientRest = false; break;
                            }
                        }
                    }
                }

                if (!hasSufficientRest) return;
                
                let stats = tempStats[candidate];
                let effectiveLastEnd = stats.lastEnd;
                for (let exc of globalExceptions) {
                    if (exc.soldierName === candidate && exc.endMs <= shift.startMs && exc.endMs > effectiveLastEnd) {
                        effectiveLastEnd = exc.endMs;
                    }
                }

                tempValid.push({
                    name: candidate,
                    totalMs: stats.totalMs,
                    nightMs: stats.nightMs,
                    lastEnd: effectiveLastEnd,
                    isDriver: soldier.isDriver
                });
            });
            
            let chosen = "חסר כוח אדם!";
            if (tempValid.length > 0) {
                // המנגנון החדש: פיצול למועמדים מועדפים ול"רזרבה חסומה" (כדי למנוע פערי שעות וטחינת נהגים)
                let minTotalMs = Math.min(...tempValid.map(c => c.totalMs));
                let preferred = [];
                let fallback = [];

                tempValid.forEach(c => {
                    // תנאי 1 להורדה בדרגה: אם המשימה לא דורשת נהג, והחייל הוא נהג! (שומרים עליהם לסיורים)
                    let isDriverWasted = (!isDriverRequiredForThisSlot && c.isDriver);
                    // תנאי 2 להורדה בדרגה: אם לחייל יש פער של יותר משעה וחצי מעל החייל עם הכי פחות שעות (מונע חזירים ששואבים משמרות)
                    let isOverScheduled = (c.totalMs > minTotalMs + 1.5 * 3600000);

                    if (isDriverWasted || isOverScheduled) {
                        fallback.push(c);
                    } else {
                        preferred.push(c);
                    }
                });

                let sortFn = (a, b) => {
                    if (shiftNightMs > 0 && (a.nightMs - b.nightMs !== 0)) return a.nightMs - b.nightMs;
                    if (a.totalMs - b.totalMs !== 0) return a.totalMs - b.totalMs;
                    return a.lastEnd - b.lastEnd;
                };
                
                preferred.sort(sortFn);
                fallback.sort(sortFn);

                let winner = preferred.length > 0 ? preferred[0] : fallback[0];
                chosen = winner.name;
                 
                tempAssignments[chosen].push({start: shift.startMs, end: shift.endMs});
                let shiftDurationMs = shift.endMs - shift.startMs;
                tempStats[chosen].totalMs += shiftDurationMs;
                if (shiftNightMs > 0) tempStats[chosen].nightMs += shiftNightMs;
                tempStats[chosen].lastEnd = Math.max(tempStats[chosen].lastEnd, shift.endMs);
            }
            shift.soldiers.push(chosen);
        }
    });

    isScheduleGenerated = true;
    saveDataToStorage(); recalculateStats(); renderTable(); populateControlTab();
}

function recalculateStats() {
    globalStats = {};
    globalSoldiers.forEach(s => {
        globalStats[s.name] = { totalMs: 0, nightMs: 0, shiftsCount: 0, assignments: [] };
    });

    globalSchedule.forEach(shift => {
        let shiftNightMs = calculateNightMs(shift.startMs, shift.endMs);
        let shiftDurationMs = shift.endMs - shift.startMs;

        shift.soldiers.forEach(soldierName => {
            if (globalStats[soldierName]) {
                globalStats[soldierName].shiftsCount++;
                globalStats[soldierName].totalMs += shiftDurationMs;
                if (shiftNightMs > 0) globalStats[soldierName].nightMs += shiftNightMs;
                globalStats[soldierName].assignments.push({ start: shift.startMs, end: shift.endMs, posName: shift.posName, shiftId: shift.id });
            }
        });
    });
}

function renderTable() {
    if (!isScheduleGenerated) return;

    const thead = document.getElementById('guard-table-head');
    const tbody = document.getElementById('guard-table-body');
    if(!thead || !tbody) return;

    const startInput = document.getElementById('start-time');
    const endInput = document.getElementById('end-time');
    const start = new Date(startInput ? startInput.value : new Date());
    const end = new Date(endInput ? endInput.value : new Date().getTime() + 86400000);

    thead.innerHTML = ''; tbody.innerHTML = '';

    let headerTr = document.createElement('tr');
    let thDay = document.createElement('th'); thDay.innerText = 'יום'; thDay.style.width = '80px'; headerTr.appendChild(thDay);
    let thExc = document.createElement('th'); thExc.innerText = 'מחוץ לשבצק'; thExc.style.width = '140px'; headerTr.appendChild(thExc);
    let thTime = document.createElement('th'); thTime.innerText = 'שעה'; thTime.style.width = '120px'; headerTr.appendChild(thTime);

    globalPositions.forEach(pos => {
        let th = document.createElement('th');
        let reqStr = pos.reqSoldiers > 1 ? ` - זוגי` : ``;
        let driverTag = pos.reqDriver ? ` (🚗)` : ``;
        th.innerText = `${pos.name} (${pos.duration} ש'${reqStr})${driverTag}`;
        headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);

    const daysHe = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    let curTime = new Date(start);
    let currentDayTracker = -1;

    while (curTime < end) {
        let nextTime = new Date(curTime.getTime() + 60 * 60 * 1000); 
        let tr = document.createElement('tr');

        if (curTime.getDay() !== currentDayTracker) {
            currentDayTracker = curTime.getDay();
            let endOfDay = new Date(curTime);
            endOfDay.setHours(23, 59, 59, 999);
            let actualEnd = endOfDay < end ? endOfDay : end;
            let hoursInDay = Math.ceil((actualEnd - curTime) / 3600000);

            let tdDay = document.createElement('td'); tdDay.rowSpan = hoursInDay;
            tdDay.innerHTML = `<strong>${daysHe[currentDayTracker]}</strong><br><span style="font-size:0.85em; color:#555">${curTime.toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'})}</span>`;
            tdDay.style.backgroundColor = '#e8ecef'; tdDay.style.verticalAlign = 'middle'; tr.appendChild(tdDay);

            let startOfDayMs = curTime.getTime(); let endOfDayMs = actualEnd.getTime();
            let dailyExceptions = globalExceptions.filter(e => e.startMs < endOfDayMs && e.endMs > startOfDayMs);
            
            let tdExc = document.createElement('td'); tdExc.rowSpan = hoursInDay;
            tdExc.style.backgroundColor = '#fdfefe'; tdExc.style.verticalAlign = 'top'; tdExc.style.fontSize = '0.9em';
            
            if (dailyExceptions.length === 0) { tdExc.innerHTML = '<span style="color:#bdc3c7;">אין</span>'; }
            else {
                tdExc.innerHTML = dailyExceptions.map(e => {
                    let s = new Date(e.startMs); let en = new Date(e.endMs);
                    let timeStr = `${s.getHours().toString().padStart(2,'0')}:${s.getMinutes().toString().padStart(2,'0')} - ${en.getHours().toString().padStart(2,'0')}:${en.getMinutes().toString().padStart(2,'0')}`;
                    let color = e.type === 'מטבח' ? '#d35400' : '#8e44ad';
                    return `<strong style="color:#2c3e50">${e.soldierName}</strong><br><span style="color:${color}; font-weight:bold;">${e.type}</span><br><span dir="ltr" style="color:#7f8c8d; font-size:0.85em;">${timeStr}</span>`;
                }).join('<hr style="margin:8px 0; border:0; border-top:1px solid #eee;">');
            }
            tr.appendChild(tdExc);
        }

        let tdTime = document.createElement('td'); tdTime.dir = 'ltr'; tdTime.style.fontWeight = 'bold';
        tdTime.style.backgroundColor = '#f8f9fa'; tdTime.innerText = `${curTime.getHours().toString().padStart(2, '0')}:00 - ${nextTime.getHours().toString().padStart(2, '0')}:00`;
        tr.appendChild(tdTime);

        globalPositions.forEach(pos => {
            let shiftData = globalSchedule.find(s => s.posId === pos.id && s.startMs === curTime.getTime());
            if (shiftData) {
                let td = document.createElement('td'); td.rowSpan = shiftData.durationHours;
                td.innerHTML = shiftData.soldiers.join('<hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;">');
                td.style.verticalAlign = 'middle';
                if (shiftData.soldiers.includes("חסר כוח אדם!")) { td.style.fontWeight = 'bold'; td.style.color = '#e74c3c'; td.style.backgroundColor = '#fadbd8'; }
                else if (shiftData.soldiers.includes("ממתין לשיבוץ")) { td.style.color = '#95a5a6'; td.style.fontStyle = 'italic'; }
                else { td.style.fontWeight = 'bold'; td.style.color = '#27ae60'; td.style.backgroundColor = '#eafaf1'; }
                tr.appendChild(td);
            }
        });

        tbody.appendChild(tr); curTime = nextTime;
    }
}

function populateControlTab() {
    const tbody = document.getElementById('control-summary-tbody'); tbody.innerHTML = '';
    
    globalSoldiers.forEach(s => {
        let st = globalStats[s.name]; let tHours = st.totalMs / 3600000; let nHours = st.nightMs / 3600000;
        let excHours = 0; globalExceptions.forEach(e => { if (e.soldierName === s.name) excHours += (e.endMs - e.startMs) / 3600000; });

        tbody.innerHTML += `<tr><td style="font-weight:bold;">${s.name} ${s.isDriver ? '🚗' : ''}</td><td>${st.shiftsCount}</td><td>${tHours} ש'</td><td>${nHours} ש'</td><td style="color:#d35400;">${excHours} ש'</td></tr>`;
    });

    const outSelect = document.getElementById('swap-soldier-out'); const inSelect = document.getElementById('swap-soldier-in');
    outSelect.innerHTML = '<option value="">1. מי החייל שיורד מהשמירה?</option>'; inSelect.innerHTML = '<option value="">3. מי החייל שיעלה במקומו?</option>';
    
    globalSoldiers.forEach(s => { outSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`; inSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`; });
}

function populateSwapShifts() {
    const soldierName = document.getElementById('swap-soldier-out').value;
    const shiftSelect = document.getElementById('swap-shift-select');
    shiftSelect.innerHTML = '<option value="">2. בחר איזו משמרת להעביר...</option>';
    if (!soldierName || !globalStats[soldierName]) return;

    let sShifts = globalStats[soldierName].assignments; sShifts.sort((a, b) => a.start - b.start);
    sShifts.forEach(s => {
        let d = new Date(s.start); let timeStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:00`;
        shiftSelect.innerHTML += `<option value="${s.shiftId}">${s.posName} | ${timeStr}</option>`;
    });
}

function executeSwap() {
    const soldierOut = document.getElementById('swap-soldier-out').value; const shiftId = document.getElementById('swap-shift-select').value; const soldierIn = document.getElementById('swap-soldier-in').value;

    if (!soldierOut || !shiftId || !soldierIn) return alert("נא לבחור את כל השדות להחלפה.");
    if (soldierOut === soldierIn) return alert("לא ניתן להחליף חייל עם עצמו.");

    let targetShift = globalSchedule.find(s => s.id === shiftId);
    if (!targetShift) return alert("משמרת לא נמצאה.");
    if (targetShift.soldiers.includes(soldierIn)) return alert("החייל המחליף כבר משובץ במשמרת זו!");

    let isTargetDriver = globalSoldiers.find(s => s.name === soldierIn)?.isDriver;
    let isDriverSlot = (targetShift.reqDriver && targetShift.soldiers.indexOf(soldierOut) === 0);
    if (isDriverSlot && !isTargetDriver) return alert("שגיאה קשיחה: עמדה זו דורשת נהג, והמחליף אינו מוסמך!");

    let inStats = globalStats[soldierIn];
    for (let s of inStats.assignments) { if (Math.max(targetShift.startMs, s.start) < Math.min(targetShift.endMs, s.end)) return alert(`שגיאה קשיחה: ל${soldierIn} כבר יש משמרת אחרת בחופפת לזמן הזה!`); }
    for (let exc of globalExceptions) { if (exc.soldierName === soldierIn && Math.max(targetShift.startMs, exc.startMs) < Math.min(targetShift.endMs, exc.endMs)) return alert(`שגיאה קשיחה: ${soldierIn} נמצא ב${exc.type} בזמן הזה!`); }

    let restViolation = false;
    for (let s of inStats.assignments) { if (Math.max(targetShift.startMs, s.start - MIN_REST_MS) < Math.min(targetShift.endMs, s.end + MIN_REST_MS)) restViolation = true; }
    for (let exc of globalExceptions) { if (exc.soldierName === soldierIn && Math.max(targetShift.startMs, exc.startMs - MIN_REST_MS) < Math.min(targetShift.endMs, exc.endMs + MIN_REST_MS)) restViolation = true; }

    if (restViolation) { if (!confirm(`אזהרת מערכת: ההחלפה תגרום ל-${soldierIn} לשמור עם פחות משעתיים מנוחה. האם לאשר בכל זאת?`)) return; }

    let indexToReplace = targetShift.soldiers.indexOf(soldierOut); targetShift.soldiers[indexToReplace] = soldierIn;

    saveDataToStorage(); recalculateStats(); renderTable(); populateControlTab(); populateSwapShifts(); 
    alert("ההחלפה בוצעה בהצלחה!");
}

function runFairnessCheck() {
    const resultsUl = document.getElementById('fairness-results'); resultsUl.innerHTML = ''; let issuesFound = 0;
    let totalHoursArr = globalSoldiers.map(s => globalStats[s.name].totalMs / 3600000);
    let avgHours = totalHoursArr.reduce((a, b) => a + b, 0) / (totalHoursArr.length || 1);

    globalSoldiers.forEach(s => {
        let stats = globalStats[s.name]; let hours = stats.totalMs / 3600000;
        if (Math.abs(hours - avgHours) >= 1.5) { resultsUl.innerHTML += `<li>⚠️ פער שעות: ${s.name} סוגר ${hours} שעות, בעוד הממוצע הוא ${avgHours.toFixed(1)}.</li>`; issuesFound++; }

        let sortedAssignments = [...stats.assignments].sort((a,b) => a.start - b.start);
        for (let i = 0; i < sortedAssignments.length - 1; i++) {
            let gap = (sortedAssignments[i+1].start - sortedAssignments[i].end) / 3600000;
            if (gap < 2) { resultsUl.innerHTML += `<li>🚨 מנוחה קצרה: ${s.name} נח רק ${gap} שעות בין משמרות.</li>`; issuesFound++; }
        }
        
        globalExceptions.forEach(exc => {
            if(exc.soldierName === s.name) {
                sortedAssignments.forEach(asg => {
                    if (Math.max(asg.start, exc.startMs) < Math.min(asg.end, exc.endMs)) { resultsUl.innerHTML += `<li>❌ התנגשות קריטית: ${s.name} משובץ למשמרת בזמן שהוא מוגדר ב${exc.type}!</li>`; issuesFound++; }
                });
            }
        });
    });

    if (issuesFound === 0) resultsUl.innerHTML = '<li style="color:#27ae60;">✅ הלוח תקין, מאוזן והוגן לחלוטין. לא נמצאו חריגות.</li>';
}

function generateSoldierReport() {
    if (!isScheduleGenerated) return alert("יש לייצר לוח לפני הפקת דו\"ח.");
    const soldierName = document.getElementById('report-soldier-select').value;
    if (!soldierName) return alert("נא לבחור חייל.");

    document.getElementById('report-results').style.display = 'block';
    let stats = globalStats[soldierName]; let shifts = [...stats.assignments].sort((a, b) => a.start - b.start);
    let tbody = document.getElementById('report-shifts-tbody'); tbody.innerHTML = '';

    if (shifts.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="color:#7f8c8d; padding:20px;">אין משמרות בלוח הנוכחי</td></tr>'; }
    else {
        shifts.forEach((s, idx) => {
            let sDate = new Date(s.start); let eDate = new Date(s.end); let duration = (s.end - s.start) / 3600000;
            let restStr = '<span style="color:#bdc3c7;">משמרת אחרונה בלוח</span>';
            if (idx < shifts.length - 1) {
                let restHours = (shifts[idx+1].start - s.end) / 3600000;
                restStr = restHours < 2 ? `<span style="color:#e74c3c; font-weight:bold;">${restHours} שעות (אזהרה)</span>` : `<strong>${restHours}</strong> שעות`;
            }
            let timeStr = `${sDate.getDate()}/${sDate.getMonth()+1} ${sDate.getHours().toString().padStart(2,'0')}:00 - ${eDate.getHours().toString().padStart(2,'0')}:00`;
            tbody.innerHTML += `<tr><td style="font-weight:bold;">${s.posName}</td><td dir="ltr">${timeStr}</td><td>${duration} ש'</td><td style="color:#27ae60;">${restStr}</td></tr>`;
        });
    }

    document.getElementById('report-total-shifts').innerText = shifts.length; document.getElementById('report-total-hours').innerText = stats.totalMs / 3600000;
    let exc = globalExceptions.filter(e => e.soldierName === soldierName); let excTbody = document.getElementById('report-exc-tbody'); excTbody.innerHTML = '';

    if (exc.length === 0) excTbody.innerHTML = '<tr><td colspan="3" style="color:#7f8c8d; padding:20px;">אין (חייל זמין לחלוטין)</td></tr>';
    else {
        exc.forEach(e => {
            let sDate = new Date(e.startMs); let eDate = new Date(e.endMs);
            let sStr = `${sDate.getDate()}/${sDate.getMonth()+1} ${sDate.getHours().toString().padStart(2,'0')}:${sDate.getMinutes().toString().padStart(2,'0')}`;
            let eStr = `${eDate.getDate()}/${eDate.getMonth()+1} ${eDate.getHours().toString().padStart(2,'0')}:${eDate.getMinutes().toString().padStart(2,'0')}`;
            excTbody.innerHTML += `<tr><td style="font-weight:bold; color:#d35400;">${e.type}</td><td dir="ltr">${sStr}</td><td dir="ltr">${eStr}</td></tr>`;
        });
    }
}

function exportToImage() {
    const captureArea = document.getElementById('capture-area');
    if (!captureArea || globalPositions.length === 0) return alert("אין נתונים בטבלה לייצוא.");
    if(typeof html2canvas === 'undefined') return alert("ספריית צילום המסך עדיין נטענת, נסה שוב בעוד שניה.");
    html2canvas(captureArea, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        const link = document.createElement('a'); link.download = `לוח_שיבוצים_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.png`;
        link.href = canvas.toDataURL('image/png'); link.click(); 
    }).catch(err => { console.error(err); alert("אירעה שגיאה בייצוא התמונה."); });
}
