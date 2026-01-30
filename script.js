// ====== Настройки Supabase ======
const SUPABASE_URL = "https://cbjpipjnwuoxozysybch.supabase.co";       // вставь свой Project URL
const SUPABASE_KEY = "sb_publishable_GVwEVH4c59J5jvHQDdlbPw_D76wE8qY";  // вставь anon public key

// Создаём клиента Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Максимальное количество голосов на одного препода с одного IP
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

// ====== Загружаем преподавателей и отображаем ======
async function loadTeachers() {
    const { data: teachers, error } = await supabase
        .from('teachers')
        .select('*')
        .order('score', { ascending: false });

    if (error) {
        console.error("Ошибка загрузки преподавателей:", error);
        return;
    }

    render(teachers);
}

// ====== Проверяем количество голосов с текущего IP ======
async function getVotesForTeacher(teacherId, ip) {
    const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('ip_address', ip);

    if (error) {
        console.error("Ошибка проверки голосов:", error);
        return [];
    }
    return data;
}

// ====== Отправка голоса ======
async function vote(teacherId, value) {
    const ip = await getIP();
    if (!ip) return alert("Не удалось определить ваш IP");

    const votes = await getVotesForTeacher(teacherId, ip);

    if (votes.length >= MAX_VOTES) {
        alert("Вы уже использовали 2 голоса для этого преподавателя");
        return;
    }

    // Сохраняем голос в таблице votes
    const { error: voteError } = await supabase
        .from('votes')
        .insert([{ teacher_id: teacherId, ip_address: ip, value }]);

    if (voteError) {
        console.error("Ошибка сохранения голоса:", voteError);
        return;
    }

    // Обновляем счёт преподавателя
    const { error: scoreError } = await supabase
        .from('teachers')
        .update({ score: supabase.raw('score + ?', [value]) })
        .eq('id', teacherId);

    if (scoreError) {
        console.error("Ошибка обновления счёта:", scoreError);
        return;
    }

    // Обновляем список преподавателей
    loadTeachers();
}

// ====== Отрисовка списка ======
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
