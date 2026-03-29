import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("JWT validation failed:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Check caller is at least admin
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["super_admin", "admin"]);

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Action non autorisée" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuperAdmin = callerRoles.some((r: any) => r.role === "super_admin");
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      return await handleCreate(adminClient, callerId, isSuperAdmin, body);
    } else if (action === "update") {
      return await handleUpdate(adminClient, callerId, isSuperAdmin, body);
    } else if (action === "change_password") {
      return await handleChangePassword(adminClient, callerId, isSuperAdmin, body);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleCreate(adminClient: any, callerId: string, isSuperAdmin: boolean, body: any) {
  const { email, full_name, phone, password, is_active, global_role, role_ids, company_ids, source_user_id } = body;

  if (!email || !full_name) {
    return jsonResponse({ error: "Email et nom complet requis" }, 400);
  }

  // Server-side password length validation
  if (password && password.length < 8) {
    return jsonResponse({ error: "Le mot de passe doit contenir au moins 8 caractères" }, 400);
  }

  // Prevent non-super-admin from creating super_admin/admin
  if (!isSuperAdmin && (global_role === "super_admin" || global_role === "admin")) {
    return jsonResponse({ error: "Action non autorisée : seul un Super Admin peut attribuer ce rôle" }, 403);
  }

  // Check email uniqueness
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const emailExists = existingUsers?.users?.some((u: any) => u.email?.toLowerCase() === email.toLowerCase());
  if (emailExists) {
    return jsonResponse({ error: "Cette adresse email existe déjà" }, 409);
  }

  // Create auth user
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: password || undefined,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError || !newUser?.user) {
    return jsonResponse({ error: createError?.message || "Erreur lors de la création" }, 500);
  }

  const userId = newUser.user.id;

  // Update profile with phone
  if (phone) {
    await adminClient.from("profiles").update({ phone }).eq("user_id", userId);
  }

  // Set is_active
  if (is_active === false) {
    await adminClient.from("profiles").update({ is_active: false }).eq("user_id", userId);
  }

  // Delete the auto-assigned default role
  await adminClient.from("user_roles").delete().eq("user_id", userId);

  // Assign global role (legacy)
  if (global_role) {
    await adminClient.from("user_roles").insert({
      user_id: userId,
      role: global_role,
      is_primary: true,
    });
  }

  // Assign functional roles (new system)
  if (role_ids && role_ids.length > 0) {
    const roleInserts = role_ids.map((roleId: string) => ({
      user_id: userId,
      role_id: roleId,
      is_primary: false,
    }));
    await adminClient.from("user_roles").insert(roleInserts);
  }

  // Assign companies
  if (company_ids && company_ids.length > 0) {
    const companyInserts = company_ids.map((cid: string, idx: number) => ({
      user_id: userId,
      company_id: cid,
      is_default: idx === 0,
    }));
    await adminClient.from("user_companies").insert(companyInserts);
  }

  // Send password reset email if no password provided (invitation)
  if (!password) {
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  }

  // Audit log
  const isDuplicate = !!source_user_id;
  await adminClient.from("audit_logs").insert({
    user_id: callerId,
    action: isDuplicate ? "user_duplicated" : "user_created",
    table_name: "profiles",
    record_id: userId,
    details: isDuplicate
      ? `Utilisateur dupliqué: ${full_name} (${email}) à partir de ${source_user_id}`
      : `Utilisateur créé: ${full_name} (${email})`,
    old_data: isDuplicate ? { source_user_id } : null,
    new_data: { full_name, email, global_role, role_ids, company_ids },
  });

  return jsonResponse({ success: true, user_id: userId });
}

async function handleUpdate(adminClient: any, callerId: string, isSuperAdmin: boolean, body: any) {
  const { target_user_id, full_name, phone, is_active, global_role, role_ids, company_ids } = body;

  if (!target_user_id) {
    return jsonResponse({ error: "target_user_id requis" }, 400);
  }

  // Prevent non-super-admin from setting super_admin/admin roles
  if (!isSuperAdmin && (global_role === "super_admin" || global_role === "admin")) {
    return jsonResponse({ error: "Action non autorisée : seul un Super Admin peut attribuer ce rôle" }, 403);
  }

  // Get old data for audit
  const { data: oldProfile } = await adminClient.from("profiles").select("*").eq("user_id", target_user_id).single();
  const { data: oldRoles } = await adminClient.from("user_roles").select("role, role_id").eq("user_id", target_user_id);

  // Update profile
  const profileUpdate: any = {};
  if (full_name !== undefined) profileUpdate.full_name = full_name;
  if (phone !== undefined) profileUpdate.phone = phone;
  if (is_active !== undefined) profileUpdate.is_active = is_active;
  
  if (Object.keys(profileUpdate).length > 0) {
    await adminClient.from("profiles").update(profileUpdate).eq("user_id", target_user_id);
  }

  // Update roles
  if (global_role !== undefined || role_ids !== undefined) {
    // Delete all existing roles
    await adminClient.from("user_roles").delete().eq("user_id", target_user_id);

    // Re-insert global role
    if (global_role) {
      await adminClient.from("user_roles").insert({
        user_id: target_user_id,
        role: global_role,
        is_primary: true,
      });
    }

    // Re-insert functional roles
    if (role_ids && role_ids.length > 0) {
      const roleInserts = role_ids.map((roleId: string) => ({
        user_id: target_user_id,
        role_id: roleId,
        is_primary: false,
      }));
      await adminClient.from("user_roles").insert(roleInserts);
    }
  }

  // Update companies
  if (company_ids !== undefined) {
    await adminClient.from("user_companies").delete().eq("user_id", target_user_id);
    if (company_ids.length > 0) {
      const companyInserts = company_ids.map((cid: string, idx: number) => ({
        user_id: target_user_id,
        company_id: cid,
        is_default: idx === 0,
      }));
      await adminClient.from("user_companies").insert(companyInserts);
    }
  }

  // Audit log
  await adminClient.from("audit_logs").insert({
    user_id: callerId,
    action: "user_modified",
    table_name: "profiles",
    record_id: target_user_id,
    details: `Utilisateur modifié: ${full_name || oldProfile?.full_name} (${oldProfile?.email})`,
    old_data: { ...oldProfile, roles: oldRoles },
    new_data: { full_name, phone, is_active, global_role, role_ids, company_ids },
  });

  return jsonResponse({ success: true });
}

async function handleChangePassword(adminClient: any, callerId: string, isSuperAdmin: boolean, body: any) {
  const { target_user_id, new_password } = body;

  if (!target_user_id || !new_password) {
    return jsonResponse({ error: "target_user_id et new_password requis" }, 400);
  }

  if (new_password.length < 8) {
    return jsonResponse({ error: "Le mot de passe doit contenir au moins 8 caractères" }, 400);
  }

  // Check target user roles - prevent non-super-admin from changing super_admin password
  const { data: targetRoles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", target_user_id)
    .in("role", ["super_admin", "admin"]);

  const targetIsSuperAdmin = targetRoles?.some((r: any) => r.role === "super_admin");
  const targetIsAdmin = targetRoles?.some((r: any) => r.role === "admin");

  if (targetIsSuperAdmin && !isSuperAdmin) {
    return jsonResponse({ error: "Seul un Super Admin peut modifier le mot de passe d'un Super Admin" }, 403);
  }
  if (targetIsAdmin && !isSuperAdmin) {
    return jsonResponse({ error: "Seul un Super Admin peut modifier le mot de passe d'un Admin" }, 403);
  }

  // Update password via admin API
  const { error: updateError } = await adminClient.auth.admin.updateUserById(target_user_id, {
    password: new_password,
  });

  if (updateError) {
    console.error("Password update error:", updateError);
    return jsonResponse({ error: "Erreur lors de la modification du mot de passe" }, 500);
  }

  // Audit log (no password stored)
  const { data: profile } = await adminClient.from("profiles").select("full_name, email").eq("user_id", target_user_id).single();
  await adminClient.from("audit_logs").insert({
    user_id: callerId,
    action: "password_changed",
    table_name: "profiles",
    record_id: target_user_id,
    details: `Mot de passe modifié pour: ${profile?.full_name || profile?.email || target_user_id}`,
    old_data: null,
    new_data: null,
  });

  return jsonResponse({ success: true });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}
