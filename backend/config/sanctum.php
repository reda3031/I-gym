<?php

use Laravel\Sanctum\Sanctum;

return [
    /*
    |--------------------------------------------------------------------------
    | Sanctum 4.3 — Configuration (Laravel 13)
    |--------------------------------------------------------------------------
    | Mode Bearer Token uniquement — pas de session SPA/cookies
    */

    // Domaines stateful pour SPA (non utilisé en mode Bearer token)
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS',
        'localhost,localhost:3000,localhost:5173,127.0.0.1,127.0.0.1:8000,::1'
    )),

    'guard' => ['web'],

    // Tokens n'expirent pas (null = sans expiration)
    'expiration' => null,

    // Préfixe pour les tokens générés
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    // Middleware Sanctum (non actif en mode Bearer pur)
    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies'      => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token'  => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
];
