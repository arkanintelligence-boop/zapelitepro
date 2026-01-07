import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        console.log("Payload recebido da Kirvano:", payload);

        // Kirvano envia eventos como 'venda_aprovada' ou similar. 
        // Ajustaremos conforme o teste, mas o padrão é processar apenas aprovações.
        // Se o evento não for de sucesso, ignoramos.
        if (payload.event_type !== 'order_approved' && payload.event !== 'order.paid') {
            return new Response(JSON.stringify({ message: "Evento ignorado" }), { status: 200 });
        }

        const customerEmail = payload.email || (payload.data && payload.data.customer && payload.data.customer.email);
        const productName = payload.product_name || (payload.data && payload.data.product && payload.data.product.name) || "";

        if (!customerEmail) throw new Error("E-mail do cliente não encontrado no payload");

        // Identifica o plano
        let planType = "Mensal";
        if (productName.toLowerCase().includes("trimestral")) planType = "Trimestral";
        if (productName.toLowerCase().includes("anual")) planType = "Anual";
        if (productName.toLowerCase().includes("vitalicio")) planType = "Vitalicio";

        // Geração de Chave Elite
        const generateKey = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let key = 'ELITE-';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 4; j++) key += chars.charAt(Math.floor(Math.random() * chars.length));
                if (i < 2) key += '-';
            }
            return key;
        };
        const newKey = generateKey();

        // Salva no Supabase (bypass RLS via Service Role)
        const { error: dbError } = await supabase
            .from('licenses')
            .insert([{
                key: newKey,
                plan_type: planType,
                is_active: true,
                customer_email: customerEmail
            }]);

        if (dbError) throw dbError;

        // Envia e-mail via Resend
        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'ZapElite Pro <vendas@zapelitepro.com.br>',
                to: [customerEmail],
                subject: '🚀 Seu Acesso ao ZapElite Pro Chegou!',
                html: `
          <div style="font-family: sans-serif; background: #0c1317; color: white; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto; border: 1px solid #1ed760;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1ed760; margin: 0;">PEDIDO APROVADO!</h1>
                <p style="color: #b3b3b3;">Parabéns! Você acaba de adquirir o poder da Tecnologia Elite.</p>
            </div>
            
            <div style="background: rgba(30, 215, 96, 0.05); padding: 30px; border-radius: 16px; border: 1px dashed #1ed760; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 0.9rem; color: #b3b3b3; text-transform: uppercase; letter-spacing: 1px;">Sua Chave de Ativação:</p>
                <h2 style="margin: 15px 0; color: #ffffff; font-size: 2rem; font-family: monospace; letter-spacing: 3px;">${newKey}</h2>
                <p style="margin: 0; font-size: 0.8rem; color: #1ed760;">Plano: ${planType}</p>
            </div>

            <div style="margin-top: 30px;">
                <h3 style="color: #ffffff; border-left: 4px solid #1ed760; padding-left: 15px;">Como Começar:</h3>
                <ul style="color: #b3b3b3; line-height: 1.8;">
                    <li>Baixe o instalador no nosso site oficial.</li>
                    <li>Instale e abra o <strong>ZapElite Pro</strong>.</li>
                    <li>Cole a chave acima e o sistema identificará seu hardware automaticamente.</li>
                </ul>
            </div>

            <p style="margin-top: 40px; font-size: 0.85rem; color: #444; text-align: center;">
                © 2026 Arkan Intelligence • ZapElite PRO v1.0.0
            </p>
          </div>
        `
            })
        });

        const resendData = await resendRes.json();
        console.log("Resposta do Resend:", resendData);

        return new Response(JSON.stringify({ success: true, key: newKey }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error("Erro no Webhook:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
