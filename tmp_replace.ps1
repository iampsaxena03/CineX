$path = "C:\Users\PS\desktop\cinex\src\lib\tmdb.ts"
$old = "export function getImageUrl(path: string | null | undefined, size = 'w500'): string {`r`n  if (!path) return ''`r`n  const tmdbUrl = ``image.tmdb.org/t/p/${size}${path}```r`n  return ``https://wsrv.nl/?url=${encodeURIComponent(tmdbUrl)}&output=webp&q=65```r`n}"
$new = "export function getImageUrl(path: string | null | undefined, size = 'w500'): string {`r`n  if (!path) return ''`r`n  // Direct TMDB image URL --- Googlebot-friendly, no proxy dependency`r`n  return ``https://image.tmdb.org/t/p/${size}${path}```r`n}`r`n`r`n// Client-side fallback: wsrv.nl proxy (for Indian ISP compatibility)`r`nexport function getClientImageUrl(path: string | null | undefined, size = 'w500'): string {`r`n  if (!path) return ''`r`n  const tmdbUrl = ``image.tmdb.org/t/p/${size}${path}```r`n  return ``https://wsrv.nl/?url=${encodeURIComponent(tmdbUrl)}&output=webp&q=65```r`n}"
$content = [System.IO.File]::ReadAllText($path)
if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    [System.IO.File]::WriteAllText($path, $content)
    Write-Host "Replaced successfully"
} else {
    Write-Host "Pattern not found"
    # Debug: show the relevant section
    $idx = $content.IndexOf("getImageUrl")
    if ($idx -ge 0) { Write-Host "Found at index $idx"; Write-Host $content.Substring($idx, 200) }
}
