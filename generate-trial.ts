import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    try {
        const { email } = await req.json();

        if (!email) throw new Error("E-mail não fornecido");

        // Geração de Chave Trial (Ex: TRIAL-XXXX-XXXX-XXXX)
        const generateKey = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let key = 'TRIAL-';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 4; j++) key += chars.charAt(Math.floor(Math.random() * chars.length));
                if (i < 2) key += '-';
            }
            return key;
        };
        const newKey = generateKey();

        // Salva no Supabase com o e-mail do cliente
        const { error: dbError } = await supabase
            .from('licenses')
            .insert([{
                key: newKey,
                plan_type: 'Trial',
                is_active: true,
                customer_email: email
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
                to: [email],
                subject: '🎁 ZapElite Pro: Seus 3 Dias Grátis Chegaram!',
                html: `
          <div style="font-family: sans-serif; background: #0c1317; color: white; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto; border: 1px solid #1ed760;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1ed760; margin: 0;">ACESSO LIBERADO!</h1>
                <p style="color: #b3b3b3;">Parabéns! Você acaba de ganhar 3 dias de acesso total à Tecnologia Elite.</p>
            </div>
            
            <div style="background: rgba(30, 215, 96, 0.05); padding: 30px; border-radius: 16px; border: 1px dashed #1ed760; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 0.9rem; color: #b3b3b3; text-transform: uppercase; letter-spacing: 1px;">Sua Chave de Ativação (3 Dias):</p>
                <h2 style="margin: 15px 0; color: #ffffff; font-size: 2rem; font-family: monospace; letter-spacing: 3px;">${newKey}</h2>
                <p style="margin: 0; font-size: 0.8rem; color: #1ed760;">Plano: Gratuito (Trial)</p>
            </div>

            <div style="margin-top: 30px;">
                <h3 style="color: #ffffff; border-left: 4px solid #1ed760; padding-left: 15px;">Como Instalar:</h3>
                <ol style="color: #b3b3b3; line-height: 1.8;">
                    <li>Baixe o instalador no site: <strong>zapelitepro.com.br</strong></li>
                    <li>Instale o software no seu Windows.</li>
                    <li>Cole a chave acima na tela inicial para ativar seu hardware.</li>
                </ol>
            </div>

            <p style="margin-top: 40px; font-size: 0.85rem; color: #444; text-align: center;">
                © 2026 Arkan Intelligence • ZapElite PRO v1.0.6
            </p>
          </div>
        `
            })
        });

        return new Response(JSON.stringify({ success: true, key: newKey }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });

    } catch (err) {
        console.error("Erro no Trial:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }
});
