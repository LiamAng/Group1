const form = document.getElementById('loginForm');

(async function checkExistingLogin() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return;

  try {
    const verify = await fetch('/students', {
      headers: { "Authorization": "Bearer " + token }
    });

    if (verify.ok) {
      window.location.href = role === 'admin'
        ? '/dashboard.html'
        : '/teacher-dashboard.html';
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    }
  } catch (err) {
    console.error("Token check failed", err);
  }
})();


form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('role', result.role);

      alert(`Logged in as ${result.role}`);

      window.location.href = '/dashboard.html'

    } else {
      alert(result.error || 'Login failed');
    }

  } catch (error) {
    alert("An error occurred connecting to the server.");
    console.error(error);
  }
});
