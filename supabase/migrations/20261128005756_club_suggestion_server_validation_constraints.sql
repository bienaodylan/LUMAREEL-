alter table public.club_suggestions
  add constraint club_suggestions_title_length check (char_length(trim(title)) between 2 and 140),
  add constraint club_suggestions_description_length check (char_length(description) <= 3000),
  add constraint club_suggestions_concept_length check (concept is null or char_length(concept) <= 3000),
  add constraint club_suggestions_city_length check (city is null or char_length(city) <= 120),
  add constraint club_suggestions_artist_type_length check (artist_type is null or char_length(artist_type) <= 60),
  add constraint club_suggestions_venue_type_length check (venue_type is null or char_length(venue_type) <= 60),
  add constraint club_suggestions_profile_url_valid check (profile_url is null or profile_url ~* '^https?://'),
  add constraint club_suggestions_reference_url_valid check (reference_url is null or reference_url ~* '^https?://');