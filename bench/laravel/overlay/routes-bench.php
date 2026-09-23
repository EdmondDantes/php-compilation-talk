
Route::get('/bench', function (\Illuminate\Http\Request $request) {
    return (string) \App\Support\Hot::checksum((int) $request->query('n', '1000'));
});
