-- Fix search path security issues for existing functions
ALTER FUNCTION public.get_user_file_limits(UUID) SET search_path = 'public';
ALTER FUNCTION public.update_file_quotas(UUID, BIGINT) SET search_path = 'public';