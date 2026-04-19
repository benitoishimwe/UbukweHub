INSERT INTO event_types (event_type_id, slug, name, description, icon, checklist_template, timeline_template, budget_categories)
VALUES
(
  gen_random_uuid()::text, 'wedding', 'Wedding', 'Traditional and modern wedding ceremonies', 'heart',
  '[
    {"category":"Venue","item":"Book wedding venue","due_weeks_before":52,"priority":"high"},
    {"category":"Venue","item":"Book ceremony location","due_weeks_before":52,"priority":"high"},
    {"category":"Catering","item":"Book caterer","due_weeks_before":40,"priority":"high"},
    {"category":"Photography","item":"Book photographer","due_weeks_before":40,"priority":"high"},
    {"category":"Photography","item":"Book videographer","due_weeks_before":36,"priority":"medium"},
    {"category":"Attire","item":"Order wedding dress","due_weeks_before":36,"priority":"high"},
    {"category":"Attire","item":"Order groom attire","due_weeks_before":24,"priority":"high"},
    {"category":"Decor","item":"Book florist","due_weeks_before":32,"priority":"medium"},
    {"category":"Music","item":"Book DJ or band","due_weeks_before":32,"priority":"high"},
    {"category":"Invitations","item":"Send save-the-dates","due_weeks_before":26,"priority":"high"},
    {"category":"Invitations","item":"Send formal invitations","due_weeks_before":10,"priority":"high"},
    {"category":"Guest","item":"Finalise guest list","due_weeks_before":16,"priority":"high"},
    {"category":"Guest","item":"Confirm final guest count","due_weeks_before":4,"priority":"high"},
    {"category":"Logistics","item":"Arrange transport","due_weeks_before":12,"priority":"medium"},
    {"category":"Logistics","item":"Book accommodation for out-of-town guests","due_weeks_before":20,"priority":"medium"}
  ]'::jsonb,
  '[
    {"time":"07:00","activity":"Bride preparation","duration_minutes":180,"responsible":"Bridal team"},
    {"time":"10:00","activity":"Ceremony begins","duration_minutes":60,"responsible":"Officiant"},
    {"time":"11:00","activity":"Photo session","duration_minutes":60,"responsible":"Photographer"},
    {"time":"12:00","activity":"Cocktail hour","duration_minutes":60,"responsible":"Catering"},
    {"time":"13:00","activity":"Reception doors open","duration_minutes":30,"responsible":"Coordinator"},
    {"time":"13:30","activity":"Bridal party entrance","duration_minutes":15,"responsible":"DJ"},
    {"time":"13:45","activity":"Welcome & toasts","duration_minutes":30,"responsible":"MC"},
    {"time":"14:15","activity":"Lunch / dinner service","duration_minutes":90,"responsible":"Catering"},
    {"time":"15:45","activity":"Cake cutting","duration_minutes":15,"responsible":"Coordinator"},
    {"time":"16:00","activity":"First dance & dancing","duration_minutes":180,"responsible":"DJ"},
    {"time":"19:00","activity":"Bouquet toss & send-off","duration_minutes":30,"responsible":"Coordinator"},
    {"time":"19:30","activity":"Venue clear-out begins","duration_minutes":60,"responsible":"Venue staff"}
  ]'::jsonb,
  '[
    {"category":"Venue","percentage":30,"notes":"Ceremony + reception"},
    {"category":"Catering","percentage":25,"notes":"Food & beverages per head"},
    {"category":"Photography","percentage":12,"notes":"Photo + video"},
    {"category":"Decor & Flowers","percentage":10,"notes":"Centrepieces, bouquets, arch"},
    {"category":"Attire","percentage":8,"notes":"Dress, suit, accessories"},
    {"category":"Music","percentage":5,"notes":"DJ or live band"},
    {"category":"Transport","percentage":4,"notes":"Bride/groom + guest shuttles"},
    {"category":"Stationery","percentage":2,"notes":"Invitations, programmes"},
    {"category":"Miscellaneous","percentage":4,"notes":"Tips, contingency"}
  ]'::jsonb
),
(
  gen_random_uuid()::text, 'corporate', 'Corporate Event', 'Business conferences, launches, and team events', 'briefcase',
  '[
    {"category":"Venue","item":"Book conference/event venue","due_weeks_before":26,"priority":"high"},
    {"category":"AV","item":"Book AV & technical equipment","due_weeks_before":16,"priority":"high"},
    {"category":"Catering","item":"Arrange catering & refreshments","due_weeks_before":12,"priority":"high"},
    {"category":"Marketing","item":"Design event branding materials","due_weeks_before":12,"priority":"medium"},
    {"category":"Speakers","item":"Confirm keynote speakers","due_weeks_before":20,"priority":"high"},
    {"category":"Registration","item":"Set up online registration","due_weeks_before":16,"priority":"high"},
    {"category":"Sponsors","item":"Secure event sponsors","due_weeks_before":20,"priority":"medium"},
    {"category":"Logistics","item":"Arrange signage & banners","due_weeks_before":4,"priority":"medium"},
    {"category":"Logistics","item":"Prepare run-of-show document","due_weeks_before":2,"priority":"high"},
    {"category":"Post-Event","item":"Plan post-event follow-up","due_weeks_before":1,"priority":"medium"}
  ]'::jsonb,
  '[
    {"time":"07:30","activity":"Venue setup & AV check","duration_minutes":90,"responsible":"AV team"},
    {"time":"08:00","activity":"Registration desk opens","duration_minutes":60,"responsible":"Admin"},
    {"time":"09:00","activity":"Opening remarks","duration_minutes":30,"responsible":"Host"},
    {"time":"09:30","activity":"Keynote presentation","duration_minutes":60,"responsible":"Speaker 1"},
    {"time":"10:30","activity":"Networking break","duration_minutes":30,"responsible":"Catering"},
    {"time":"11:00","activity":"Panel discussion","duration_minutes":90,"responsible":"Moderator"},
    {"time":"12:30","activity":"Lunch","duration_minutes":60,"responsible":"Catering"},
    {"time":"13:30","activity":"Breakout sessions","duration_minutes":90,"responsible":"Facilitators"},
    {"time":"15:00","activity":"Tea break","duration_minutes":20,"responsible":"Catering"},
    {"time":"15:20","activity":"Closing keynote","duration_minutes":45,"responsible":"Speaker 2"},
    {"time":"16:05","activity":"Closing remarks & networking","duration_minutes":55,"responsible":"Host"}
  ]'::jsonb,
  '[
    {"category":"Venue","percentage":35},
    {"category":"AV & Tech","percentage":15},
    {"category":"Catering","percentage":25},
    {"category":"Marketing","percentage":10},
    {"category":"Speakers","percentage":10},
    {"category":"Miscellaneous","percentage":5}
  ]'::jsonb
),
(
  gen_random_uuid()::text, 'birthday', 'Birthday Party', 'Birthday celebrations for all ages', 'cake',
  '[
    {"category":"Venue","item":"Book party venue","due_weeks_before":12,"priority":"high"},
    {"category":"Catering","item":"Book caterer or order cake","due_weeks_before":4,"priority":"high"},
    {"category":"Entertainment","item":"Book entertainer or DJ","due_weeks_before":8,"priority":"medium"},
    {"category":"Invitations","item":"Send invitations","due_weeks_before":4,"priority":"high"},
    {"category":"Decor","item":"Order decorations","due_weeks_before":2,"priority":"medium"},
    {"category":"Guest","item":"Confirm final head count","due_weeks_before":1,"priority":"high"}
  ]'::jsonb,
  '[
    {"time":"14:00","activity":"Guest arrival & welcome drinks","duration_minutes":30,"responsible":"Host"},
    {"time":"14:30","activity":"Games & activities","duration_minutes":60,"responsible":"Entertainer"},
    {"time":"15:30","activity":"Food service","duration_minutes":60,"responsible":"Catering"},
    {"time":"16:30","activity":"Cake & birthday song","duration_minutes":15,"responsible":"Host"},
    {"time":"16:45","activity":"Dancing & free time","duration_minutes":75,"responsible":"DJ"},
    {"time":"18:00","activity":"Event ends","duration_minutes":30,"responsible":"Host"}
  ]'::jsonb,
  '[
    {"category":"Venue","percentage":30},
    {"category":"Catering & Cake","percentage":35},
    {"category":"Entertainment","percentage":15},
    {"category":"Decor","percentage":10},
    {"category":"Miscellaneous","percentage":10}
  ]'::jsonb
),
(
  gen_random_uuid()::text, 'conference', 'Conference', 'Professional conferences, summits, and seminars', 'users',
  '[
    {"category":"Venue","item":"Book conference hall","due_weeks_before":40,"priority":"high"},
    {"category":"Speakers","item":"Curate speaker lineup","due_weeks_before":30,"priority":"high"},
    {"category":"Sponsors","item":"Launch sponsorship drive","due_weeks_before":30,"priority":"high"},
    {"category":"AV","item":"Book live-streaming setup","due_weeks_before":20,"priority":"high"},
    {"category":"Registration","item":"Launch ticket sales","due_weeks_before":24,"priority":"high"},
    {"category":"Content","item":"Finalise agenda & sessions","due_weeks_before":12,"priority":"high"},
    {"category":"Catering","item":"Plan meals & breaks","due_weeks_before":8,"priority":"medium"},
    {"category":"Logistics","item":"Prepare speaker kits","due_weeks_before":4,"priority":"medium"}
  ]'::jsonb,
  '[]'::jsonb,
  '[
    {"category":"Venue","percentage":30},
    {"category":"AV & Streaming","percentage":20},
    {"category":"Speakers","percentage":15},
    {"category":"Catering","percentage":15},
    {"category":"Marketing","percentage":12},
    {"category":"Miscellaneous","percentage":8}
  ]'::jsonb
),
(
  gen_random_uuid()::text, 'private_party', 'Private Party', 'Exclusive private gatherings and celebrations', 'star',
  '[
    {"category":"Venue","item":"Confirm venue / home setup","due_weeks_before":6,"priority":"high"},
    {"category":"Catering","item":"Arrange food & drinks","due_weeks_before":3,"priority":"high"},
    {"category":"Entertainment","item":"Organise entertainment","due_weeks_before":4,"priority":"medium"},
    {"category":"Invitations","item":"Send invites","due_weeks_before":3,"priority":"high"},
    {"category":"Decor","item":"Plan decorations","due_weeks_before":2,"priority":"medium"}
  ]'::jsonb,
  '[]'::jsonb,
  '[
    {"category":"Venue / Setup","percentage":20},
    {"category":"Catering","percentage":40},
    {"category":"Entertainment","percentage":20},
    {"category":"Decor","percentage":10},
    {"category":"Miscellaneous","percentage":10}
  ]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
