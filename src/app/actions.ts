'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAs(role: string) {
  const validRoles = ['admin', 'manager', 'west_manager', 'staff'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  cookies().set('mock_role', role, { path: '/' });
  redirect('/manager/schedule');
}

export async function logout() {
  cookies().delete('mock_role');
  redirect('/');
}
