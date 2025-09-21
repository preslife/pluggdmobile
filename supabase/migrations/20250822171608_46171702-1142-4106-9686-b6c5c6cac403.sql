-- Allow admins to upload contest files
CREATE POLICY "Admins can upload contest files" ON storage.objects
FOR INSERT TO public
WITH CHECK ((bucket_id = 'contests'::text) AND (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::user_role)))));

-- Allow public read access to contest files
CREATE POLICY "Contest files are publicly accessible" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'contests'::text);

-- Allow admins to update contest files  
CREATE POLICY "Admins can update contest files" ON storage.objects
FOR UPDATE TO public
USING ((bucket_id = 'contests'::text) AND (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::user_role)))));

-- Allow admins to delete contest files
CREATE POLICY "Admins can delete contest files" ON storage.objects
FOR DELETE TO public
USING ((bucket_id = 'contests'::text) AND (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::user_role)))));