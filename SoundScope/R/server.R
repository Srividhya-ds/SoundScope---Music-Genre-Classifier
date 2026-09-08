# SoundScope: R Web Server (powered by httpuv)
# Serves the HTML5/CSS3/JavaScript dashboard and GTZAN audio assets

suppressPackageStartupMessages({
  library(httpuv)
  library(tools)
})

root_dir <- normalizePath("C:/Users/srivi/.gemini/antigravity/scratch/SoundScope")
port <- 8080

get_content_type <- function(filepath) {
  ext <- tolower(file_ext(filepath))
  switch(ext,
    "html" = "text/html; charset=utf-8",
    "css"  = "text/css; charset=utf-8",
    "js"   = "application/javascript; charset=utf-8",
    "json" = "application/json; charset=utf-8",
    "wav"  = "audio/wav",
    "mp3"  = "audio/mpeg",
    "ogg"  = "audio/ogg",
    "csv"  = "text/csv; charset=utf-8",
    "svg"  = "image/svg+xml",
    "png"  = "image/png",
    "jpg"  = "image/jpeg",
    "ico"  = "image/x-icon",
    "application/octet-stream"
  )
}

app <- list(
  call = function(req) {
    path <- req$PATH_INFO
    if (is.null(path) || path == "/" || path == "") {
      path <- "/index.html"
    }
    path <- utils::URLdecode(path)
    # Remove leading slash
    rel_path <- substring(path, 2)
    file_path <- file.path(root_dir, rel_path)
    
    if (file.exists(file_path) && !dir.exists(file_path)) {
      content_type <- get_content_type(file_path)
      file_size <- file.info(file_path)$size
      
      # Read file bytes
      content <- readBin(file_path, "raw", n = file_size)
      
      list(
        status = 200L,
        headers = list(
          "Content-Type" = content_type,
          "Access-Control-Allow-Origin" = "*",
          "Cache-Control" = "no-cache"
        ),
        body = content
      )
    } else {
      list(
        status = 404L,
        headers = list(
          "Content-Type" = "text/plain",
          "Access-Control-Allow-Origin" = "*"
        ),
        body = paste0("404 Not Found: ", path)
      )
    }
  }
)

cat("========================================================\n")
cat("  SoundScope Web Platform — R Local Server\n")
cat(sprintf("  Dashboard URL: http://localhost:%d\n", port))
cat("========================================================\n")
cat("Serving files from:", root_dir, "\n")
cat("Opening browser...\n\n")

tryCatch({
  utils::browseURL(sprintf("http://localhost:%d", port))
}, error = function(e) {})

cat("Server is live! Press Ctrl+C in terminal to stop.\n")
runServer("127.0.0.1", port, app)
