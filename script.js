let isScheduleGenerated = false;
let globalSoldiers = [];
let globalPositions = [];

const MIN_REST_MS = 2 * 60 * 60 * 1000; 

window.onload = () => {
    const now = new Date();
    const start = new Date(now.setHours(8, 0, 0, 0));
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const startInput = document.getElementById('start-time');
    const endInput = document.getElementById('end-time');
    if(startInput) startInput.value = start.toISOString().slice(0, 16);
    if(endInput) endInput.value = end.toISOString().slice(0, 16);
    
    document.getElementById('soldier-name')?.addEventListener('keypress', e => { if (e.key === 'Enter') addSoldier(); });
    document.getElementById('position-name')?.addEventListener('keypress', e => { if (e.key === 'Enter') addPosition(); });
    document.getElementById('position-duration')?.addEventListener('keypress', e => { if (e.key === 'Enter') addPosition(); });
    document.getElementById('position-req-soldiers')?.addEventListener('keypress', e => { if (e.key === 'Enter') addPosition(); });
    
    // טעינת נתונים מהדפדפן
    loadDataFromStorage();
};

function showSection(id) {
    document.getElementById('schedule-section').style.display = id === 'schedule' ? 'block' : 'none';
    document.getElementById('admin-section').style.display = id === 'admin' ? 'block' : 'none';
    
    document.getElementById('nav-schedule').classList.toggle('active', id === 'schedule');
    document.getElementById('nav-admin').classList.toggle('active', id === 'admin');
}

// פונקציה חדשה שקוראת את הנתונים מזיכרון הדפדפן (LocalStorage)
function loadDataFromStorage() {
    const savedSoldiers = localStorage.getItem('soldiersData');
    const savedPositions = localStorage.getItem('positionsData');

    if (savedSoldiers) globalSoldiers = JSON.parse(savedSoldiers);
    if (savedPositions) globalPositions = JSON.parse(savedPositions);

    updateUI();
}

// פונקציה חדשה ששומרת נתונים לזיכרון הדפדפן
function saveDataToStorage() {
    localStorage.setItem('soldiersData', JSON.stringify(globalSoldiers));
    localStorage.setItem('positionsData', JSON.stringify(globalPositions));
}

function updateUI() {
    const totalSoldiersEl = document.getElementById('total-soldiers');
    const totalPositionsEl = document.getElementById('total-positions');
    if (totalSoldiersEl) totalSoldiersEl.innerText = globalSoldiers.length;
    if (totalPositionsEl) totalPositionsEl.innerText = globalPositions.length;

    const sList = document.getElementById('admin-soldiers-list');
    if (sList) {
        if (globalSoldiers.length === 0) sList.innerHTML = '<li style="color: #95a5a6; font-style: italic;">אין חיילים במערכת</li>';
        else sList.innerHTML = globalSoldiers.map(s => `<li>• ${s.name}</li>`).join('');
    }

    const pList = document.getElementById('admin-positions-list');
    if (pList) {
        if (globalPositions.length === 0) pList.innerHTML = '<li style="color: #95a5a6; font-style: italic;">אין עמדות במערכת</li>';
        else pList.innerHTML = globalPositions.map(p => `<li>• ${p.name} <span style="color:#7f8c8d; font-size:0.9em;">(${p.duration} שעות | ${p.reqSoldiers} חיילים)</span></li>`).join('');
    }

    renderTable();
}

function addSoldier() {
    const input = document.getElementById('soldier-name');
    const val = input.value.trim();
    if (!val) return;
    
    // ואלידציה 1: בדיקה שהשם לא קיים כבר
    const nameExists = globalSoldiers.some(s => s.name === val);
    if (nameExists) {
        alert("שגיאה: חייל בשם הזה כבר קיים במערכת!");
        return;
    }
    
    // שמירה מקומית
    globalSoldiers.push({ id: Date.now(), name: val });
    saveDataToStorage();
    
    input.value = '';
    isScheduleGenerated = false;
    updateUI();
    input.focus();
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

function resetSystem() {
    if (confirm("פעולה זו תמחק לחלוטין את כל הנתונים. האם להמשיך?")) {
        globalSoldiers = [];
        globalPositions = [];
        localStorage.removeItem('soldiersData');
        localStorage.removeItem('positionsData');
        isScheduleGenerated = false;
        updateUI();
    }
}

function generateSchedule() {
    if (globalSoldiers.length === 0 || globalPositions.length === 0) {
        alert("יש להזין לפחות חייל אחד ועמדה אחת כדי לבצע שיבוץ.");
        return;
    }

    // ואלידציה 2: בדיקת היתכנות כמות כוח אדם למול משימות
    let totalConcurrentSoldiersNeeded = 0;
    globalPositions.forEach(pos => {
        totalConcurrentSoldiersNeeded += pos.reqSoldiers;
    });

    if (globalSoldiers.length < totalConcurrentSoldiersNeeded) {
        alert(`שגיאה קריטית: חסר כוח אדם!\nסך העמדות דורשות ${totalConcurrentSoldiersNeeded} חיילים במקביל, אך רשומים רק ${globalSoldiers.length} חיילים במערכת. אנא הוסף חיילים או צמצם עמדות.`);
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
    thDay.style.width = '100px';
    headerTr.appendChild(thDay);

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
    let soldierLastPosition = {}; 
    
    globalSoldiers.forEach(s => { 
        soldierAssignments[s.name] = []; 
        soldierLastPosition[s.name] = null;
    });
    
    let currentSoldierIndex = 0;

    allShifts.forEach(shift => {
        let assignedList = []; 
        
        if (isScheduleGenerated && globalSoldiers.length > 0) {
            for (let slot = 0; slot < shift.reqSoldiers; slot++) {
                let bestCandidate = null;       
                let goodCandidate = null;       
                let emergencyCandidate = null;  
                
                let checkedCount = 0;
                
                while (checkedCount < globalSoldiers.length) {
                    let candidate = globalSoldiers[currentSoldierIndex % globalSoldiers.length].name;
                    currentSoldierIndex++;
                    checkedCount++;

                    if (assignedList.includes(candidate)) continue;

                    let overlaps = false;
                    let hasSufficientRest = true;

                    for (let existingShift of soldierAssignments[candidate]) {
                        if (Math.max(shift.startMs, existingShift.start) < Math.min(shift.endMs, existingShift.end)) {
                            overlaps = true;
                            break;
                        }
                        
                        if (Math.max(shift.startMs, existingShift.start - MIN_REST_MS) < Math.min(shift.endMs, existingShift.end + MIN_REST_MS)) {
                            hasSufficientRest = false;
                        }
                    }

                    if (!overlaps) {
                        if (hasSufficientRest) {
                            if (soldierLastPosition[candidate] !== shift.posId) {
                                bestCandidate = candidate;
                                break; 
                            } else if (!goodCandidate) {
                                goodCandidate = candidate; 
                            }
                        } else if (!emergencyCandidate) {
                            emergencyCandidate = candidate; 
                        }
                    }
                }
                
                let chosen = bestCandidate || goodCandidate || emergencyCandidate || "חסר כוח אדם!"; 
                
                if (chosen !== "חסר כוח אדם!") {
                     soldierAssignments[chosen].push({start: shift.startMs, end: shift.endMs});
                     soldierLastPosition[chosen] = shift.posId;
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