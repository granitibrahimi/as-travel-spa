<?php

use Illuminate\Support\Facades\Route;

/*
 * This app is a shell for the standalone Vue SPA. Every non-asset path returns
 * the same view; Vue Router owns client-side routing. Data + auth come from the
 * AS Travel platform API (see resources/js/api.js).
 */
Route::view('/{any?}', 'app')->where('any', '.*');
