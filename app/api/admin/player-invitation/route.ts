import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    if (!accessToken) {
      return NextResponse.json({ error: "Sign in as the BASE25 owner first." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Player invitations are not configured. The server is missing SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 }
      );
    }

    const ownerClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: userData, error: userError } = await ownerClient.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const { data: staffRows, error: staffError } = await ownerClient.rpc("get_my_staff_access");
    const staff = Array.isArray(staffRows) ? staffRows[0] : null;
    if (staffError || !staff?.is_active || staff.role !== "owner") {
      return NextResponse.json({ error: "Only the BASE25 owner can send player invitations." }, { status: 403 });
    }

    const body = await request.json();
    const playerId = typeof body.player_id === "string" ? body.player_id : "";
    if (!playerId) {
      return NextResponse.json({ error: "A player profile is required." }, { status: 400 });
    }

    const [{ data: players, error: playersError }, { data: statuses, error: statusesError }] =
      await Promise.all([
        ownerClient.rpc("admin_list_players"),
        ownerClient.rpc("admin_list_player_account_status"),
      ]);
    if (playersError || statusesError) {
      return NextResponse.json(
        { error: playersError?.message || statusesError?.message || "Could not verify the player profile." },
        { status: 400 }
      );
    }

    const player = (players || []).find((row: any) => row.id === playerId);
    const account = (statuses || []).find((row: any) => row.player_id === playerId);
    if (!player || !account?.assigned_email) {
      return NextResponse.json({ error: "Assign an email to this player before sending an invitation." }, { status: 400 });
    }
    if (account.account_status === "Verified") {
      return NextResponse.json({ error: "This player account is already verified." }, { status: 409 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      account.assigned_email,
      {
        data: {
          username: player.username,
          full_name: player.full_name || player.username,
          account_type: "player",
        },
        redirectTo: `${request.nextUrl.origin}/reset-password`,
      }
    );

    if (inviteError) {
      const message = /already.*(registered|exists)|already been registered/i.test(inviteError.message)
        ? "An Auth account already exists for this email. The invitation was not resent; use Forgot Password for that account."
        : inviteError.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${account.assigned_email}. The player can open the email, set a password, and then sign in.`,
      invited: !!invitation.user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected invitation error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
