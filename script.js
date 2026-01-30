// ====== Настройки Supabase ======
const SUPABASE_URL = "https://cbjpipjnwuoxozysybch.supabase.co";       // вставь свой Project URL
const SUPABASE_KEY = "sb_publishable_GVwEVH4c59J5jvHQDdlbPw_D76wE8qY";  // вставь anon public key

const MAX_VOTES = 2;

// ====== Получаем IP пользователя ======
async function getIP() {
    try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        return data.ip;
    } catch (e) {
        console.error("Не удалось получить IP:", e);
        return null;
    }
}

// ====== Получаем список преподавателей ======
async function loadTeachers() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/teachers?select=*&order=score.desc`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });

    const teachers = await res.json();
    render(teachers);
}

// ====== Получаем голоса текущего IP для преподавателя ======
async function getVotesForTeacher(teacherId, ip) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/votes?teacher_id=eq.${teacherId}&ip_address=eq.${ip}`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });
    const votes = await res.json();
    return votes;
}

// ====== Голосование ======
async function vote(teacherId, value) {
    const ip = await getIP();
    if (!ip) return alert("Не удалось определить ваш IP");

    const votes = await getVotesForTeacher(teacherId, ip);
    if (votes.length >= MAX_VOTES) {
        alert("Вы уже использовали 2 голоса для этого преподавателя");
        return;
    }

    // Добавляем голос
    await fetch(`${SUPABASE_URL}/rest/v1/votes`, {
        method: "POST",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            teacher_id: teacherId,
            ip_address: ip,
            value
        })
    });

    // Обновляем счёт преподавателя через PATCH
    // Для этого используем формулу: score = score + value
    // Supabase REST API не поддерживает выражения напрямую, поэтому сначала нужно получить текущее значение
    const scoreRes = await fetch(`${SUPABASE_URL}/rest/v1/teachers?id=eq.${teacherId}`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });
    const teacherData = await scoreRes.json();
    if (teacherData.length === 0) return;
    const newScore = teacherData[0].score + value;

    await fetch(`${SUPABASE_URL}/rest/v1/teachers?id=eq.${teacherId}`, {
        method: "PATCH",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ score: newScore })
    });

    loadTeachers();
}

// ====== Отрисовка ======
function render(teachers) {
    const container = document.getElementById("scoreboard");
    container.innerHTML = "";

    teachers.forEach(t => {
        const div = document.createElement("div");
        div.className = "teacher";

        div.innerHTML = `
            <span><strong>${t.name}</strong> — ${t.score}</span>
            <div class="buttons">
                <button onclick="vote(${t.id}, 1)">👍</button>
                <button onclick="vote(${t.id}, -1)">👎</button>
            </div>
        `;

        container.appendChild(div);
    });
}

// ====== Запуск ======
loadTeachers();
