import type { InvokeCoach } from '@/application/coach';

import { supabase } from './supabase';

export const coachInvoker: InvokeCoach | null = supabase
  ? async (body) => {
      const { data, error } = await supabase!.functions.invoke('coach', { body, timeout: 12_000 });
      if (error) throw error;
      return data;
    }
  : null;
