<?php

return [
    /*
    |--------------------------------------------------------------------------
    | CORS — Cross-Origin Resource Sharing (Laravel 13)
    |--------------------------------------------------------------------------
    | Autoriser le frontend React (localhost:5173) à appeler l'API Laravel
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // false car on utilise des Bearer tokens, pas de cookies/sessions
    'supports_credentials' => false,
];
