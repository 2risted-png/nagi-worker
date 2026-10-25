export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Заголовки для обхода кэша и разрешения запросов с сайта
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ================= НАСТРОЙКИ =================
      if (url.pathname === '/api/settings' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM settings').all();
        const settings = {};
        results.forEach(row => settings[row.key] = row.value);
        return new Response(JSON.stringify(settings), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (url.pathname === '/api/settings' && request.method === 'POST') {
        const body = await request.json();
        for (const [key, value] of Object.entries(body)) {
          await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, value).run();
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ================= УСЛУГИ =================
      if (url.pathname === '/api/services' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM services ORDER BY id ASC').all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (url.pathname === '/api/services' && request.method === 'POST') {
        const body = await request.json();
        await env.DB.prepare('INSERT OR REPLACE INTO services (id, name, price, desc, details, time, image) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(body.id, body.name, body.price, body.desc, body.details, body.time, body.image).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (url.pathname.startsWith('/api/services/') && request.method === 'DELETE') {
        const id = url.pathname.split('/').pop();
        await env.DB.prepare('DELETE FROM services WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ================= ЗАЯВКИ =================
      if (url.pathname === '/api/bookings' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (url.pathname === '/api/bookings' && request.method === 'POST') {
        const body = await request.json();
        await env.DB.prepare('INSERT INTO bookings (booking_number, name, phone, date, time, service, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))')
          .bind(body.bookingNumber, body.name, body.phone, body.date, body.time, body.serviceName, body.comment).run();

        // Отправка уведомления в ВК
        if (env.VK_TOKEN && env.VK_ADMIN_ID) {
          const vkMessage = `Новая заявка ${body.bookingNumber}:\n\nИмя: ${body.name}\nНомер телефона: ${body.phone}\nДата и время: ${body.date} в ${body.time}\nУслуга: ${body.serviceName}\nКомментарий: ${body.comment || 'Нет'}`;
          await fetch('https://api.vk.com/method/messages.send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              access_token: env.VK_TOKEN, v: '5.131', peer_id: env.VK_ADMIN_ID,
              message: vkMessage, random_id: Math.floor(Math.random() * 1000000)
            })
          });
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (url.pathname.startsWith('/api/bookings/') && request.method === 'DELETE') {
        const id = url.pathname.split('/').pop();
        await env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ================= ОТЗЫВЫ =================
      if (url.pathname === '/api/reviews' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM reviews ORDER BY id DESC').all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (url.pathname === '/api/reviews' && request.method === 'POST') {
        const body = await request.json();
        await env.DB.prepare('INSERT INTO reviews (name, date, text) VALUES (?, ?, ?)').bind(body.name, body.date, body.text).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (url.pathname.startsWith('/api/reviews/') && request.method === 'DELETE') {
        const id = url.pathname.split('/').pop();
        await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }
};