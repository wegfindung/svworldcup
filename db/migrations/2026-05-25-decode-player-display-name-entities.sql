UPDATE world_cup_players
SET display_name = trim(
  regexp_replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(display_name, '&amp;', '&'),
              '&apos;',
              chr(39)
            ),
            '&#39;',
            chr(39)
          ),
          '&#x27;',
          chr(39)
        ),
        '&quot;',
        '"'
      ),
      '&nbsp;',
      ' '
    ),
    '[[:space:]]+',
    ' ',
    'g'
  )
)
WHERE display_name ~* '&(amp|apos|#39|#x27|quot|nbsp);';
