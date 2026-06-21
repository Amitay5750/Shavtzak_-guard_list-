let isScheduleGenerated = false;
let globalSoldiers = [];
let globalPositions = [];
let globalExceptions = []; 

// חוק קשיח מס' 2: שעתיים מנוחה מינימום ללא פשרות (מונע רצף)
const MIN_REST_MS = 2 * 60 * 60 * 1000; 

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
    
    document.getElementById('soldier-name')?.addEventListener('keypress', e => { if (e.key === 'Enter') addSoldier(); });
    document.getElementById('position-name')?.addEventListener('keypress', e => { if (e.key === 'Enter') addPosition(); });
    document.getElementById('position-duration')?.addEventListener('keypress', e => { if (e.key === 'Enter') addPosition(); });
    document.getElementById('position-req-soldiers')?.addEventListener('keypress', e => { if (e.key === 'Enter') addPosition(); });
    
    loadDataFromStorage();
};

function showSection(id) {
    document.getElementById('schedule-section').style.display = id === 'schedule' ? 'block' : 'none';
    document.getElementById('admin-section').style.display = id === 'admin' ? 'block' : 'none';
    document.getElementById('nav-schedule').classList.toggle('active', id === 'schedule');
    document.getElementById('nav-admin').classList.toggle('active', id === 'admin');
}

function loadDataFromStorage() {
    const savedSoldiers = localStorage.getItem('soldiersData');
    const savedPositions = localStorage.getItem('positionsData');
    const savedExceptions = localStorage.getItem('exceptionsData');

    if (savedSoldiers) globalSoldiers = JSON.parse(savedSoldiers);
    if (savedPositions) globalPositions = JSON.parse(savedPositions);
    if (savedExceptions) globalExceptions = JSON.parse(savedExceptions);

    updateUI();
}

function saveDataToStorage() {
    localStorage.setItem('soldiersData', JSON.stringify(globalSoldiers));
    localStorage.setItem('positionsData', JSON.stringify(globalPositions));
    localStorage.setItem('exceptionsData', JSON.stringify(globalExceptions));
}

function updateUI() {
    const totalSoldiersEl = document.getElementById('total-soldiers');
    const totalPositionsEl = document.getElementById('total-positions');
    if (totalSoldiersEl) totalSoldiersEl.innerText = globalSoldiers.length;
    if (totalPositionsEl) totalPositionsEl.innerText = globalPositions.length;

    const sList = document.getElementById('admin-soldiers-list');
    const excSoldierSelect = document.getElementById('exception-soldier');
    
    if (sList && excSoldierSelect) {
        excSoldierSelect.innerHTML = '<option value="">בחר חייל...</option>';
        if (globalSoldiers.length === 0) {
            sList.innerHTML = '<li style="color: #95a5a6; font-style: italic;">אין חיילים במערכת</li>';
        } else {
            sList.innerHTML = globalSoldiers.map((s, idx) => `<li><span style="display:inline-block; width:20px; font-weight:bold;">${idx + 1}.</span> ${s.name} <button onclick="deleteSoldier(${s.id})" style="background:none; color:red; border:none; padding:0 10px; font-size:0.9em; cursor:pointer; margin-right:auto;">(הסר)</button></li>`).join('');
            globalSoldiers.forEach(s => {
                excSoldierSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
            });
        }
    }

    const pList = document.getElementById('admin-positions-list');
    if (pList) {
        if (globalPositions.length === 0) pList.innerHTML = '<li style="color: #95a5a6; font-style: italic;">אין עמדות במערכת</li>';
        else {
            pList.innerHTML = globalPositions.map((p, idx) => `<li><span style="display:inline-block; width:20px; font-weight:bold;">${idx + 1}.</span> ${p.name} <span style="color:#7f8c8d; font-size:0.9em; margin-right:5px;">(${p.duration} שעות | ${p.reqSoldiers} חיילים)</span> <button onclick="deletePosition(${p.id})" style="background:none; color:red; border:none; padding:0 10px; font-size:0.9em; cursor:pointer; margin-right:auto;">(הסר)</button></li>`).join('');
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

    renderTable();
}

function addSoldier() {
    const input = document.getElementById('soldier-name');
    const val = input.value.trim();
    if (!val) return;
    
    if (globalSoldiers.some(s => s.name === val)) {
        alert("שגיאה: חייל בשם הזה כבר קיים במערכת!");
        return;
    }
    
    globalSoldiers.push({ id: Date.now(), name: val });
    saveDataToStorage();
    input.value = '';
    isScheduleGenerated = false;
    updateUI();
    input.focus();
}

function deleteSoldier(id) {
    const soldierToDelete = globalSoldiers.find(s => s.id === id);
    if (soldierToDelete) {
        globalExceptions = globalExceptions.filter(e => e.soldierName !== soldierToDelete.name);
    }
    globalSoldiers = globalSoldiers.filter(s => s.id !== id);
    saveDataToStorage();
    isScheduleGenerated = false;
    updateUI();
}

function addPosition() {
    const nameInput = document.getElementById('position-name');
    const durInput = document.getElementById('position-duration');
    const reqInput = document.getElementById('position-req-soldiers');
    
    const name = nameInput.value.trim();
    const dur = parseInt(durInput.value.trim() || "4"); 
    const req = parseInt(reqInput.value.trim() || "1"); 
    
    if (!name) return;
    
    globalPositions.push({ id: Date.now(), name: name, duration: dur, reqSoldiers: req });
    saveDataToStorage();

    nameInput.value = '';
    durInput.value = '';
    reqInput.value = '';
    isScheduleGenerated = false;
    updateUI();
    nameInput.focus();
}

function deletePosition(id) {
    globalPositions = globalPositions.filter(p => p.id !== id);
    saveDataToStorage();
    isScheduleGenerated = false;
    updateUI();
}

function addException() {
    const soldier = document.getElementById('exception-soldier').value;
    const type = document.getElementById('exception-type').value;
    const startStr = document.getElementById('exception-start').value;
    const endStr = document.getElementById('exception-end').value;

    if (!soldier || !startStr || !endStr) {
        alert("נא למלא את כל השדות להוספת חריגה.");
        return;
    }

    const startMs = new Date(startStr).getTime();
    const endMs = new Date(endStr).getTime();

    if (startMs >= endMs) {
        alert("זמן סיום חייב להיות אחרי זמן התחלה.");
        return;
    }

    globalExceptions.push({ id: Date.now(), soldierName: soldier, type: type, startMs: startMs, endMs: endMs });
    saveDataToStorage();
    isScheduleGenerated = false;
    updateUI();
}

function deleteException(id) {
    globalExceptions = globalExceptions.filter(e => e.id !== id);
    saveDataToStorage();
    isScheduleGenerated = false;
    updateUI();
}

function resetSystem() {
    if (confirm("פעולה זו תמחק לחלוטין את כל הנתונים כולל חריגים. האם להמשיך?")) {
        globalSoldiers = [];
        globalPositions = [];
        globalExceptions = [];
        localStorage.clear();
        isScheduleGenerated = false;
        updateUI();
    }
}

function generateSchedule() {
    if (globalSoldiers.length === 0 || globalPositions.length === 0) {
        alert("יש להזין לפחות חייל אחד ועמדה אחת כדי לבצע שיבוץ.");
        return;
    }

    let totalConcurrentSoldiersNeeded = 0;
    globalPositions.forEach(pos => totalConcurrentSoldiersNeeded += pos.reqSoldiers);

    if (globalSoldiers.length < totalConcurrentSoldiersNeeded) {
        alert(`שגיאה קריטית: חסר כוח אדם!\nסך העמדות דורשות ${totalConcurrentSoldiersNeeded} חיילים במקביל, אך רשומים רק ${globalSoldiers.length} חיילים.`);
        return;
    }

    isScheduleGenerated = true;
    renderTable(); 
}

function renderTable() {
    const thead = document.getElementById('guard-table-head');
    const tbody = document.getElementById('guard-table-body');
    if(!thead || !tbody) return;

    const startInput = document.getElementById('start-time');
    const endInput = document.getElementById('end-time');
    const start = new Date(startInput ? startInput.value : new Date());
    const end = new Date(endInput ? endInput.value : new Date().getTime() + 86400000);

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (globalPositions.length === 0) {
        thead.innerHTML = '<tr><th>סטטוס</th></tr>';
        tbody.innerHTML = '<tr><td style="padding:30px; color:#7f8c8d;">נא להוסיף עמדות כדי להתחיל</td></tr>';
        return;
    }

    let headerTr = document.createElement('tr');
    
    let thDay = document.createElement('th');
    thDay.innerText = 'יום';
    thDay.style.width = '80px';
    headerTr.appendChild(thDay);

    let thExc = document.createElement('th');
    thExc.innerText = 'מחוץ לשבצק';
    thExc.style.width = '140px';
    headerTr.appendChild(thExc);

    let thTime = document.createElement('th');
    thTime.innerText = 'שעה';
    thTime.style.width = '120px';
    headerTr.appendChild(thTime);

    globalPositions.forEach(pos => {
        let th = document.createElement('th');
        let reqStr = pos.reqSoldiers > 1 ? ` - זוגי` : ``;
        th.innerText = `${pos.name} (${pos.duration} ש'${reqStr})`;
        headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);

    let allShifts = [];
    globalPositions.forEach(pos => {
        let cur = new Date(start);
        while (cur < end) {
            let next = new Date(cur.getTime() + pos.duration * 60 * 60 * 1000);
            if (next > end) next = end;
            allShifts.push({
                posId: pos.id,
                reqSoldiers: pos.reqSoldiers,
                startMs: cur.getTime(),
                endMs: next.getTime(),
                durationHours: Math.round((next - cur) / 3600000)
            });
            cur = next;
        }
    });

    allShifts.sort((a, b) => a.startMs - b.startMs);

    let assignments = {};
    globalPositions.forEach(pos => { assignments[pos.id] = []; });
    
    let soldierAssignments = {};
    
    // ניהול "בנקי שעות" לאיזון עומס - חוקים 3 ו-4
    let soldierStats = {}; 
    
    globalSoldiers.forEach(s => { 
        soldierAssignments[s.name] = []; 
        soldierStats[s.name] = { totalMs: 0, nightMs: 0, lastEnd: 0 };
    });
    
    allShifts.forEach(shift => {
        let assignedList = []; 
        let shiftHour = new Date(shift.startMs).getHours();
        
        // הגדרת משמרת לילה: מתחילה בין 22:00 ל-05:59 בבוקר
        let isNightShift = (shiftHour >= 22 || shiftHour < 6);
        
        if (isScheduleGenerated && globalSoldiers.length > 0) {
            for (let slot = 0; slot < shift.reqSoldiers; slot++) {
                
                let validCandidates = [];
                
                globalSoldiers.forEach(soldier => {
                    let candidate = soldier.name;
                    
                    // בדיקה האם כבר מאייש עמדה אחרת בדיוק באותה השעה
                    if (assignedList.includes(candidate)) return;

                    // חוק 1 (קשיח): חריגים ומחוץ למצבה
                    let isExcluded = false;
                    for (let exc of globalExceptions) {
                        if (exc.soldierName === candidate) {
                            if (Math.max(shift.startMs, exc.startMs) < Math.min(shift.endMs, exc.endMs)) {
                                isExcluded = true;
                                break;
                            }
                        }
                    }
                    if (isExcluded) return; 

                    // חוק 2 (קשיח): האם נח מספיק? מונע רצפים
                    let hasSufficientRest = true;
                    for (let existingShift of soldierAssignments[candidate]) {
                        if (Math.max(shift.startMs, existingShift.start - MIN_REST_MS) < Math.min(shift.endMs, existingShift.end + MIN_REST_MS)) {
                            hasSufficientRest = false;
                            break;
                        }
                    }
                    
                    // בדיקת מנוחה גם למול חריגים (למשל: לא יעלה שמירה מיד כשיורד ממטבח)
                    if (hasSufficientRest) {
                        for (let exc of globalExceptions) {
                            if (exc.soldierName === candidate) {
                                if (Math.max(shift.startMs, exc.startMs - MIN_REST_MS) < Math.min(shift.endMs, exc.endMs + MIN_REST_MS)) {
                                    hasSufficientRest = false;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // אם אין מנוחה חוקית, הוא נפסל מלהיות מועמד (יוצג "חסר כוח אדם!" אם כולם נפסלים)
                    if (!hasSufficientRest) return;
                    
                    let stats = soldierStats[candidate];
                    let effectiveLastEnd = stats.lastEnd;
                    
                    // מוודא שה"מנוחה" מחושבת גם מסיום התורנות ולא רק משמירות
                    for (let exc of globalExceptions) {
                        if (exc.soldierName === candidate && exc.endMs <= shift.startMs && exc.endMs > effectiveLastEnd) {
                            effectiveLastEnd = exc.endMs;
                        }
                    }

                    validCandidates.push({
                        name: candidate,
                        totalMs: stats.totalMs,
                        nightMs: stats.nightMs,
                        lastEnd: effectiveLastEnd
                    });
                });
                
                // מיון המועמדים התקינים לפי הוגנות עומס (חוקים 3 ו-4)
                validCandidates.sort((a, b) => {
                    // א. איזון לילות: אם זו משמרת לילה, קודם כל נבדוק למי יש פחות שעות לילה במצטבר
                    if (isNightShift) {
                        let nightDiff = a.nightMs - b.nightMs;
                        if (nightDiff !== 0) return nightDiff; 
                    }
                    
                    // ב. איזון כללי: למי יש פחות שעות שמירה כלליות במצטבר
                    let totalDiff = a.totalMs - b.totalMs;
                    if (totalDiff !== 0) return totalDiff;
                    
                    // ג. שובר שוויון: מי שהמשמרת/תורנות האחרונה שלו הסתיימה הכי מזמן (נח הכי הרבה)
                    return a.lastEnd - b.lastEnd;
                });
                
                let chosen = "חסר כוח אדם!";
                if (validCandidates.length > 0) {
                     let winner = validCandidates[0];
                     chosen = winner.name;
                     
                     // עדכון בנקי השעות לאחר שיבוץ מוצלח
                     soldierAssignments[chosen].push({start: shift.startMs, end: shift.endMs});
                     let shiftDurationMs = shift.endMs - shift.startMs;
                     soldierStats[chosen].totalMs += shiftDurationMs;
                     if (isNightShift) soldierStats[chosen].nightMs += shiftDurationMs;
                     soldierStats[chosen].lastEnd = Math.max(soldierStats[chosen].lastEnd, shift.endMs);
                }
                assignedList.push(chosen);
            }
        } else {
             for (let slot = 0; slot < shift.reqSoldiers; slot++) {
                 assignedList.push("ממתין לשיבוץ");
             }
        }

        assignments[shift.posId].push({
            startMs: shift.startMs,
            durationHours: shift.durationHours,
            soldiers: assignedList
        });
    });

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

            let tdDay = document.createElement('td');
            tdDay.rowSpan = hoursInDay;
            tdDay.innerHTML = `<strong>${daysHe[currentDayTracker]}</strong><br><span style="font-size:0.85em; color:#555">${curTime.toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'})}</span>`;
            tdDay.style.backgroundColor = '#e8ecef';
            tdDay.style.verticalAlign = 'middle';
            tr.appendChild(tdDay);

            let startOfDayMs = curTime.getTime();
            let endOfDayMs = actualEnd.getTime();
            let dailyExceptions = globalExceptions.filter(e => e.startMs < endOfDayMs && e.endMs > startOfDayMs);
            
            let tdExc = document.createElement('td');
            tdExc.rowSpan = hoursInDay;
            tdExc.style.backgroundColor = '#fdfefe';
            tdExc.style.verticalAlign = 'top';
            tdExc.style.fontSize = '0.9em';
            
            if (dailyExceptions.length === 0) {
                tdExc.innerHTML = '<span style="color:#bdc3c7;">אין</span>';
            } else {
                tdExc.innerHTML = dailyExceptions.map(e => {
                    let s = new Date(e.startMs);
                    let en = new Date(e.endMs);
                    let timeStr = `${s.getHours().toString().padStart(2,'0')}:${s.getMinutes().toString().padStart(2,'0')} - ${en.getHours().toString().padStart(2,'0')}:${en.getMinutes().toString().padStart(2,'0')}`;
                    let color = e.type === 'מטבח' ? '#d35400' : '#8e44ad';
                    return `<strong style="color:#2c3e50">${e.soldierName}</strong><br><span style="color:${color}; font-weight:bold;">${e.type}</span><br><span dir="ltr" style="color:#7f8c8d; font-size:0.85em;">${timeStr}</span>`;
                }).join('<hr style="margin:8px 0; border:0; border-top:1px solid #eee;">');
            }
            tr.appendChild(tdExc);
        }

        let tdTime = document.createElement('td');
        tdTime.dir = 'ltr';
        tdTime.style.fontWeight = 'bold';
        tdTime.style.backgroundColor = '#f8f9fa';
        tdTime.innerText = `${curTime.getHours().toString().padStart(2, '0')}:00 - ${nextTime.getHours().toString().padStart(2, '0')}:00`;
        tr.appendChild(tdTime);

        globalPositions.forEach(pos => {
            let shiftStart = assignments[pos.id].find(s => s.startMs === curTime.getTime());
            
            if (shiftStart) {
                let td = document.createElement('td');
                td.rowSpan = shiftStart.durationHours;
                
                td.innerHTML = shiftStart.soldiers.join('<hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;">');
                td.style.verticalAlign = 'middle';
                
                if (shiftStart.soldiers.includes("חסר כוח אדם!")) {
                    td.style.fontWeight = 'bold';
                    td.style.color = '#e74c3c';
                    td.style.backgroundColor = '#fadbd8'; 
                } else if (shiftStart.soldiers.includes("ממתין לשיבוץ")) {
                    td.style.color = '#95a5a6';
                    td.style.fontStyle = 'italic';
                } else {
                    td.style.fontWeight = 'bold';
                    td.style.color = '#27ae60';
                    td.style.backgroundColor = '#eafaf1'; 
                }
                tr.appendChild(td);
            }
        });

        tbody.appendChild(tr);
        curTime = nextTime;
    }
}

function exportToImage() {
    const captureArea = document.getElementById('capture-area');
    if (!captureArea || globalPositions.length === 0) {
        alert("אין נתונים בטבלה לייצוא.");
        return;
    }
    
    if(typeof html2canvas === 'undefined') {
        alert("ספריית צילום המסך עדיין נטענת, נסה שוב בעוד שניה.");
        return;
    }

    html2canvas(captureArea, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        const link = document.createElement('a');
        link.download = `לוח_שיבוצים_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click(); 
    }).catch(err => {
        console.error(err);
        alert("אירעה שגיאה בייצוא התמונה.");
    });
}
