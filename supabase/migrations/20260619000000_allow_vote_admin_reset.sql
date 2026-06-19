/*
  # Allow vote admins to reset votes

  The admin UI can clear all votes only for users that pass the vote-specific
  admin check. The UI also requires the admin password before issuing DELETE.
*/

DROP POLICY IF EXISTS "Vote admins can delete votes" ON votes;

CREATE POLICY "Vote admins can delete votes"
  ON votes FOR DELETE
  TO authenticated
  USING (public.vote_is_admin());
