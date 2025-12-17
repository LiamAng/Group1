let currentStudentList = [];

window.onload = async function () {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role) {
        window.location.href = "/";
        return;
    }

    setupDashboardForRole(role);
    setupQRScanner();
    setupLogout();
    setupAddViolationDialog();
    if (role === "admin") {
        setupAddStudentDialog();
        setupSidebarNavigation();
    }

    await loadStudents();
};

function setupDashboardForRole(role) {
    const sidebarContainer = document.getElementById("sidebarContainer");
    const mainContent = document.getElementById("mainContent");
    const title = document.getElementById("dashboardTitle");

    if (role === "admin") {
        title.textContent = "Admin Dashboard";
        sidebarContainer.innerHTML = `
            <div class="w3-sidebar w3-bar-block w3-collapse w3-card w3-animate-left" style="width:200px;" id="mySidebar">
                <div class="w3-bar-item w3-hide-large">
                    <input 
                        type="image" 
                        src="imgs/close.png" 
                        onclick="w3_close()" 
                        class="w3-right" 
                        alt="Close" 
                        style="width:24px; height:24px;"
                    />
                </div>
                <a href="#" class="w3-bar-item w3-button" id="studentsTab">Students</a>
                <a href="#" class="w3-bar-item w3-button" id="teachersTab">Teachers</a>
                <a href="#" class="w3-bar-item w3-button" id="violationsTab">Violations</a>
                <a href="#" class="w3-bar-item w3-button" id="reportsTab">Reports</a>
            </div>
        `;

        mainContent.style.marginLeft = "200px";

        mainContent.querySelector(".horizontal.large-bar").innerHTML = `
            <button class="w3-button w3-teal w3-xlarge w3-hide-large" onclick="w3_open()">&#9776;</button>
        ` + mainContent.querySelector(".horizontal.large-bar").innerHTML;
    } else {
        title.textContent = "Teacher Dashboard";
        sidebarContainer.innerHTML = "";
        mainContent.style.marginLeft = "0";
    }
}

function setupSidebarNavigation() {
    document.getElementById("studentsTab")?.addEventListener("click", async (e) => {
        e.preventDefault();
        w3_close();
        await loadStudents();
    });

    document.getElementById("teachersTab")?.addEventListener("click", async (e) => {
        e.preventDefault();
        w3_close();
        await loadTeachers();
    });

    document.getElementById("violationsTab")?.addEventListener("click", async (e) => {
        e.preventDefault();
        w3_close();
        await loadViolations();
    });

    document.getElementById("reportsTab")?.addEventListener("click", async (e) => {
        e.preventDefault();
        w3_close();
        await loadReports();
    });
}

function setupQRScanner() {
    const qrScanBtn = document.getElementById("qrScanBtn");
    const scanDialog = document.getElementById("qrScanDialog");
    const closeScanDialog = document.getElementById("closeScanQrDialog");
    const studentResultDialog = document.getElementById("scannedStudentDialog");

    let html5QrcodeScanner = null;

    function onScanSuccess(decodedText, decodedResult) {
        console.log(`Scanned LRN: ${decodedText}`);
        
        const student = currentStudentList.find(s => s.LRN === decodedText);

        if (student) {
            showScannedStudentResult(student);
            html5QrcodeScanner.disabled = true;
            html5QrcodeScanner.clear();
            scanDialog.close();
        } else {
            alert(`Error: Student with LRN ${decodedText} not found.`);
        }
    }

    qrScanBtn.addEventListener("click", function () {
        scanDialog.showModal();
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        
        html5QrcodeScanner.render(onScanSuccess);
    });

    closeScanDialog.addEventListener("click", () => {
        scanDialog.close();
    });

    document.getElementById("closeScannedStudentDialog")?.addEventListener("click", () => {
        studentResultDialog.close();
    });
}

function showScannedStudentResult(student) {
    const dialog = document.getElementById("scannedStudentDialog");
    const content = document.getElementById("scannedStudentInfo");
    const studentName = `${student.first_name} ${student.last_name}`;

    content.innerHTML = `
        <div class="w3-card w3-padding">
            <p><strong>Name:</strong> ${studentName}</p>
            <p><strong>LRN:</strong> ${student.LRN}</p>
            <p><strong>Grade/Section:</strong> ${student.grade_section}</p>
        </div>
        <div style="margin-top: 15px;">
            <button class="w3-button w3-orange" onclick="showStudentViolations('${student.LRN}', '${studentName}');">
                View Violations
            </button>
            <button class="w3-button w3-purple" onclick="showAddViolationDialog('${student.LRN}', '${studentName}');">
                Add Violation
            </button>
        </div>
    `;
    dialog.showModal();
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn.addEventListener("click", function() {
        if (confirm("Are you sure you want to log out?")) {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            window.location.href = "/";
        }
    });
}

function showQRDialog(lrn, studentName) {
    const dialog = document.getElementById("qrDialog");
    const qrCodeDiv = document.getElementById("qrCode");
    const closeDialog = document.getElementById("closeQrDialog");
    
    qrCodeDiv.innerHTML = "";
    
    dialog.querySelector("h3").textContent = `QR Code for ${studentName}`;
    
    document.getElementById("qrData").style.display = "none";
    document.getElementById("generateBtn").style.display = "none";
    
    new QRCode(qrCodeDiv, {
        text: lrn,
        width: 256,
        height: 256
    });
    
    dialog.showModal();
    
    closeDialog.onclick = () => {
        dialog.close();
        dialog.querySelector("h3").textContent = "Generate QR Code";
        qrCodeDiv.innerHTML = "";
    };
    
    dialog.addEventListener("click", e => { 
        if (e.target.tagName === "DIALOG") {
            dialog.close();
            dialog.querySelector("h3").textContent = "Generate QR Code";
            qrCodeDiv.innerHTML = "";
        }
    });
}

function setupAddStudentDialog() {
    const addStudentBtn = document.getElementById("addStudentBtn");
    const addStudentDialog = document.getElementById("addStudentDialog");
    const closeBtn = document.getElementById("closeAddStudentDialog");
    const form = document.getElementById("addStudentForm");

    addStudentBtn?.addEventListener("click", () => addStudentDialog.showModal());
    closeBtn.addEventListener("click", () => addStudentDialog.close());
    addStudentDialog.addEventListener("click", e => { if (e.target.tagName === "DIALOG") addStudentDialog.close(); });

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        if (!token) { alert("Session expired."); window.location.href = "/login.html"; return; }

        const formData = new FormData(form);
        try {
            const res = await fetch("/add-student", {
                method: "POST",
                headers: { "Authorization": "Bearer " + token },
                body: formData
            });
            const result = await res.json();
            if (res.ok) {
                alert(`Student added: ${formData.get("first_name")} ${formData.get("last_name")}`);
                form.reset();
                addStudentDialog.close();
                await loadStudents();
            } else alert(result.error || "Failed to add student.");
        } catch (err) { console.error(err); alert("Network error."); }
    });
}

async function loadStudents() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const tabContent = document.getElementById("tabContent");
    tabContent.innerHTML = "<p>Loading students...</p>";

    try {
        const res = await fetch("/students", { headers: { "Authorization": "Bearer " + token } });
        const students = await res.json();
        currentStudentList = students;
        if (!Array.isArray(students) || students.length === 0) {
            tabContent.innerHTML = `
            <div style="margin-bottom: 10px;">
                <button class="w3-button w3-green" id="addStudentBtn" ${role !== 'admin' ? 'style="display:none;"' : ''}>Add Student</button>
            </div>
            <p>No students found.</p>
            `;
            setupAddStudentDialog();
            return;
        }

        let html = `
            <div style="margin-bottom: 10px;">
                <button class="w3-button w3-green" id="addStudentBtn" ${role !== 'admin' ? 'style="display:none;"' : ''}>Add Student</button>
            </div>
            <div class="table-responsive">
            <table class="w3-table w3-striped w3-bordered">
                <tr>
                    <th>Photo</th>
                    <th>LRN</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Grade/Section</th>
                    <th>Actions</th>
                </tr>`;

        students.forEach(s => {
            html += `<tr>
                        <td><div class="photo-cell">${s.photo ? `<img src="${s.photo}" alt="Photo" style="width:50px;height:50px;object-fit:cover;border-radius:4px;">` : 'No Photo'}</div></td>
                        <td>${s.LRN}</td>
                        <td>${s.first_name}</td>
                        <td>${s.last_name}</td>
                        <td>${s.grade_section}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="w3-button w3-small w3-blue generate-student-qr" data-lrn="${s.LRN}" data-name="${s.first_name} ${s.last_name}">
                                    QR
                                </button>
                                <button class="w3-button w3-small w3-orange show-violations" data-lrn="${s.LRN}" data-name="${s.first_name} ${s.last_name}">
                                    Violations
                                </button>
                                <button class="w3-button w3-small w3-purple add-violation" data-lrn="${s.LRN}" data-name="${s.first_name} ${s.last_name}">
                                    Add Violation
                                </button>
                                ${role === 'admin' ? `<button class="w3-button w3-small w3-red delete-student" data-lrn="${s.LRN}">Delete</button>` : ''}
                            </div>
                        </td>
                     </tr>`;
        });

        html += "</table></div>";
        tabContent.innerHTML = html;

        document.querySelectorAll(".generate-student-qr").forEach(btn => {
            btn.addEventListener("click", function() {
                const lrn = this.getAttribute("data-lrn");
                const name = this.getAttribute("data-name");
                showQRDialog(lrn, name);
            });
        });

        document.querySelectorAll(".show-violations").forEach(btn => {
            btn.addEventListener("click", async function() {
                const lrn = this.getAttribute("data-lrn");
                const name = this.getAttribute("data-name");
                await showStudentViolations(lrn, name);
            });
        });

        document.querySelectorAll(".add-violation").forEach(btn => {
            btn.addEventListener("click", function() {
                const lrn = this.getAttribute("data-lrn");
                const name = this.getAttribute("data-name");
                showAddViolationDialog(lrn, name);
            });
        });

        if (role === 'admin') {
            document.querySelectorAll(".delete-student").forEach(btn => {
                btn.addEventListener("click", async function() {
                    const lrn = this.getAttribute("data-lrn");
                    if (confirm(`Are you sure you want to delete student with LRN ${lrn}?`)) {
                        await deleteStudent(lrn);
                    }
                });
            });

            setupAddStudentDialog();
        }

    } catch (err) {
        console.error(err);
        tabContent.innerHTML = "<p style='color:red;'>Network error.</p>";
    }
}

async function deleteStudent(lrn) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/delete-student/${lrn}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();
        if (res.ok) {
            alert("Student deleted successfully.");
            await loadStudents();
        } else {
            alert(result.error || "Failed to delete student.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error.");
    }
}

async function loadTeachers() {
    const token = localStorage.getItem("token");
    const tabContent = document.getElementById("tabContent");
    tabContent.innerHTML = "<p>Loading teachers...</p>";

    try {
        const res = await fetch("/teachers", { headers: { "Authorization": "Bearer " + token } });
        const teachers = await res.json();
        if (!Array.isArray(teachers) || teachers.length === 0) {
            tabContent.innerHTML = "<p>No teachers found.</p>";
            return;
        }

        let html = `
            <div style="margin-bottom: 10px;">
                <button class="w3-button w3-green" id="addTeacherBtn">Add Teacher</button>
            </div>
            <table class="w3-table w3-striped w3-bordered">
                <tr>
                    <th>Teacher ID</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Actions</th>
                </tr>`;

        teachers.forEach(t => {
            html += `<tr>
                        <td>${t.teacher_id}</td>
                        <td>${t.username}</td>
                        <td>${t.role}</td>
                        <td>
                            <button class="w3-button w3-small w3-red delete-teacher" data-id="${t.teacher_id}">Delete</button>
                        </td>
                     </tr>`;
        });

        html += "</table>";
        tabContent.innerHTML = html;

        document.querySelectorAll(".delete-teacher").forEach(btn => {
            btn.addEventListener("click", async function() {
                const id = this.getAttribute("data-id");
                if (confirm(`Are you sure you want to delete teacher with ID ${id}?`)) {
                    await deleteTeacher(id);
                }
            });
        });

        setupAddTeacherDialog();

    } catch (err) {
        console.error(err);
        tabContent.innerHTML = "<p style='color:red;'>Network error.</p>";
    }
}

function setupAddTeacherDialog() {
    const addTeacherBtn = document.getElementById("addTeacherBtn");
    const addTeacherDialog = document.getElementById("addTeacherDialog");
    const closeBtn = document.getElementById("closeAddTeacherDialog");
    const form = document.getElementById("addTeacherForm");

    addTeacherBtn?.addEventListener("click", () => addTeacherDialog.showModal());
    closeBtn.addEventListener("click", () => addTeacherDialog.close());
    addTeacherDialog.addEventListener("click", e => { if (e.target.tagName === "DIALOG") addTeacherDialog.close(); });

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        if (!token) { alert("Session expired."); window.location.href = "/login.html"; return; }

        const formData = {
            username: form.username.value,
            password: form.password.value,
            role: form.role.value
        };

        try {
            const res = await fetch("/add-teacher", {
                method: "POST",
                headers: { 
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            if (res.ok) {
                alert(`Teacher added: ${formData.username}`);
                form.reset();
                addTeacherDialog.close();
                await loadTeachers();
            } else alert(result.error || "Failed to add teacher.");
        } catch (err) { console.error(err); alert("Network error."); }
    });
}

async function deleteTeacher(id) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/delete-teacher/${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();
        if (res.ok) {
            alert("Teacher deleted successfully.");
            await loadTeachers();
        } else {
            alert(result.error || "Failed to delete teacher.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error.");
    }
}

async function loadViolations() {
    const token = localStorage.getItem("token");
    const tabContent = document.getElementById("tabContent");
    tabContent.innerHTML = "<p>Loading violations...</p>";

    try {
        const res = await fetch("/violations", { headers: { "Authorization": "Bearer " + token } });
        const violations = await res.json();
        if (!Array.isArray(violations) || violations.length === 0) {
            tabContent.innerHTML = "<p>No violations found.</p>";
            return;
        }

        let html = `
            <div class="table-responsive">
            <table class="w3-table w3-striped w3-bordered">
                <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>LRN</th>
                    <th>Violation Type</th>
                    <th>Description</th>
                    <th>Recorded By</th>
                </tr>`;

        violations.forEach(v => {
            html += `<tr>
                        <td>${new Date(v.date).toLocaleDateString()}</td>
                        <td>${v.first_name} ${v.last_name}</td>
                        <td>${v.LRN}</td>
                        <td><span class="w3-tag w3-red">${v.violation_type}</span></td>
                        <td>${v.description || 'N/A'}</td>
                        <td>${v.recorded_by}</td>
                     </tr>`;
        });

        html += "</table></div>";
        tabContent.innerHTML = html;

    } catch (err) {
        console.error(err);
        tabContent.innerHTML = "<p style='color:red;'>Network error.</p>";
    }
}

async function showStudentViolations(lrn, name) {
    const token = localStorage.getItem("token");
    const dialog = document.getElementById("viewViolationsDialog");
    const content = document.getElementById("violationsContent");
    
    dialog.querySelector("h3").textContent = `Violations for ${name}`;
    content.innerHTML = "<p>Loading...</p>";
    dialog.showModal();

    try {
        const res = await fetch(`/violations/student/${lrn}`, { 
            headers: { "Authorization": "Bearer " + token } 
        });
        const violations = await res.json();
        
        if (!Array.isArray(violations) || violations.length === 0) {
            content.innerHTML = "<p>No violations found for this student.</p>";
            return;
        }

        let html = `<div class="violations-list">`;
        violations.forEach(v => {
            html += `
                <div class="violation-item w3-card w3-margin-bottom" style="padding: 10px;">
                    <p><strong>Date:</strong> ${new Date(v.date).toLocaleDateString()}</p>
                    <p><strong>Type:</strong> <span class="w3-tag w3-red">${v.violation_type}</span></p>
                    <p><strong>Description:</strong> ${v.description || 'N/A'}</p>
                    <p><strong>Recorded by:</strong> ${v.recorded_by}</p>
                </div>`;
        });
        html += "</div>";
        content.innerHTML = html;

    } catch (err) {
        console.error(err);
        content.innerHTML = "<p style='color:red;'>Network error.</p>";
    }
}

function showAddViolationDialog(lrn, name) {
    const dialog = document.getElementById("addViolationDialog");
    const form = document.getElementById("addViolationForm");
    
    dialog.querySelector("h3").textContent = `Add Violation for ${name}`;
    form.dataset.lrn = lrn;
    form.dataset.name = name;
    
    dialog.showModal();
}

function setupAddViolationDialog() {
    const dialog = document.getElementById("addViolationDialog");
    const closeBtn = document.getElementById("closeAddViolationDialog");
    const form = document.getElementById("addViolationForm");

    closeBtn.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", e => { if (e.target.tagName === "DIALOG") dialog.close(); });

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        if (!token) { alert("Session expired."); window.location.href = "/login.html"; return; }

        const lrn = form.dataset.lrn;
        const violationData = {
            LRN: lrn,
            violation_type: form.violation_type.value,
            description: form.description.value
        };

        try {
            const res = await fetch("/add-violation", {
                method: "POST",
                headers: { 
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(violationData)
            });
            const result = await res.json();
            if (res.ok) {
                alert(`Violation added for ${form.dataset.name}`);
                form.reset();
                dialog.close();
            } else alert(result.error || "Failed to add violation.");
        } catch (err) { console.error(err); alert("Network error."); }
    });
}

async function loadReports() {
    const token = localStorage.getItem("token");
    const tabContent = document.getElementById("tabContent");
    tabContent.innerHTML = "<p>Loading reports...</p>";

    try {
        const res = await fetch("/reports", { headers: { "Authorization": "Bearer " + token } });
        const data = await res.json();
        
        let html = `
            <div class="w3-row-padding">
                <div class="w3-col m6 l3 w3-margin-bottom">
                    <div class="w3-card w3-container w3-blue" style="padding: 20px;">
                        <h3>${data.totalStudents}</h3>
                        <p>Total Students</p>
                    </div>
                </div>
                <div class="w3-col m6 l3 w3-margin-bottom">
                    <div class="w3-card w3-container w3-red" style="padding: 20px;">
                        <h3>${data.totalViolations}</h3>
                        <p>Total Violations</p>
                    </div>
                </div>
                <div class="w3-col m6 l3 w3-margin-bottom">
                    <div class="w3-card w3-container w3-green" style="padding: 20px;">
                        <h3>${data.totalTeachers}</h3>
                        <p>Total Teachers</p>
                    </div>
                </div>
                <div class="w3-col m6 l3 w3-margin-bottom">
                    <div class="w3-card w3-container w3-orange" style="padding: 20px;">
                        <h3>${data.violationsThisMonth}</h3>
                        <p>Violations This Month</p>
                    </div>
                </div>
            </div>
            
            <h3>Recent Violations</h3>
            <div class="table-responsive">
            <table class="w3-table w3-striped w3-bordered">
                <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Violation Type</th>
                    <th>Recorded By</th>
                </tr>`;

        if (data.recentViolations && data.recentViolations.length > 0) {
            data.recentViolations.forEach(v => {
                html += `<tr>
                            <td>${new Date(v.date).toLocaleDateString()}</td>
                            <td>${v.first_name} ${v.last_name}</td>
                            <td><span class="w3-tag w3-red">${v.violation_type}</span></td>
                            <td>${v.recorded_by}</td>
                         </tr>`;
            });
        } else {
            html += `<tr><td colspan="4" style="text-align:center;">No recent violations</td></tr>`;
        }

        html += "</table></div>";
        tabContent.innerHTML = html;

    } catch (err) {
        console.error(err);
        tabContent.innerHTML = "<p style='color:red;'>Network error.</p>";
    }
}

function w3_open() { 
    const role = localStorage.getItem("role");
    var sidebar = document.getElementById("mySidebar");
    if (role !== "admin" && sidebar == undefined) return;
    sidebar.style.display = "block"; 
}
function w3_close() {
    const role = localStorage.getItem("role");
    var sidebar = document.getElementById("mySidebar");
    if (role !== "admin" && sidebar == undefined) return;
    sidebar.style.display = "none";
}