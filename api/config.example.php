<?php
// Copy this file to config.php and fill in your cPanel MySQL details.
return [
  'db_host'    => 'localhost',
  'db_name'    => 'cpaneluser_pos',     // the DB you create in cPanel
  'db_user'    => 'cpaneluser_posuser', // the DB user you create in cPanel
  'db_pass'    => 'your_db_password',
  'jwt_secret' => 'CHANGE_THIS_to_a_long_random_string',
  'jwt_ttl'    => 43200,                // token lifetime in seconds (12h)
];
