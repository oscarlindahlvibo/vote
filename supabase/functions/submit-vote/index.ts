import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const body = await req.json();
    const { truck_number, voter_name, mobile_number } = body;

    if (!truck_number || !voter_name || !mobile_number) {
      return new Response(
        JSON.stringify({ error: "Alla fält är obligatoriska." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const truckNum = parseInt(truck_number, 10);
    if (isNaN(truckNum) || truckNum < 1001 || truckNum > 2150) {
      return new Response(
        JSON.stringify({ error: "Utställningsnumret måste vara mellan 1001 och 2150." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedName = voter_name.trim();
    if (cleanedName.length < 2) {
      return new Response(
        JSON.stringify({ error: "Namnet måste vara minst 2 tecken." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedMobile = mobile_number.replace(/\s+/g, "").trim();
    if (cleanedMobile.length < 6) {
      return new Response(
        JSON.stringify({ error: "Ange ett giltigt mobilnummer." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("votes").insert({
      truck_number: truckNum,
      voter_name: cleanedName,
      mobile_number: cleanedMobile,
      ip_address: ip,
    });

    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Det har redan röstats från detta mobilnummer." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Din röst är registrerad!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error submitting vote:", err);
    return new Response(
      JSON.stringify({ error: "Ett fel uppstod. Försök igen." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
