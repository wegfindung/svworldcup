UPDATE world_cup_players
SET image_url = 'https://elrincondeldt.com/sv/photos/players_webp/' || player_id || '.webp',
    updated_at = NOW()
WHERE image_url LIKE 'https://elrincondeldt.com/sv/photos/players/%.png';
