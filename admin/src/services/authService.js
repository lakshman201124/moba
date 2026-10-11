import { supabase } from "../lib/supabase";
import { isDemo, exitDemo } from "../lib/demo";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", data.user.id)
    .single();

  if (staffErr || !staff || !staff.is_active) {
    await supabase.auth.signOut();
    throw new Error("NOT_STAFF");
  }

  return { user: data.user, staff };
}

export async function signOut() {
  if (isDemo) return exitDemo();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPasswordRequest(email, redirectTo) {
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function getStaffRow(userId) {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data?.is_active ? data : null;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
