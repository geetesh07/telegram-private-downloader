// ==UserScript==
// @name Telegram Media Downloader by Geetesh
// @version 1.01
// @namespace https://github.com/geetesh07/telegram-private-downloader
// @description Download images, GIFs, videos, and voice messages on the Telegram webapp from private channels.
// @match https://web.telegram.org/*
// ==/UserScript==

(function () {
    const logger = {
        info: (message) => console.log(`[Tel Download] ${message}`),
        error: (message) => console.error(`[Tel Download] ${message}`),
    };

    const downloadQueue = []; // Queue to hold download requests
    let isDownloading = false; // Flag to check if a download is in progress

    const processQueue = () => {
        if (downloadQueue.length === 0 || isDownloading) return;

        isDownloading = true;
        const { url, callback } = downloadQueue.shift(); // Get the next download request

        tel_download_video(url).then(() => {
            isDownloading = false;
            processQueue(); // Process the next request in the queue
            if (callback) callback();
        });
    };

    const tel_download_video = (url) => {
        return new Promise((resolve) => {
            let _blobs = [];
            let _next_offset = 0;
            let _total_size = null;
            const videoId = Math.random().toString(36).substring(2, 10);
            let fileName = "video.mp4"; // Default file name

            const fetchNextPart = () => {
                fetch(url, { method: "GET", headers: { Range: `bytes=${_next_offset}-` } })
                    .then((res) => {
                        if (![200, 206].includes(res.status)) throw new Error("Non 200/206 response");
                        _total_size = parseInt(res.headers.get("Content-Length"));
                        return res.blob();
                    })
                    .then((resBlob) => {
                        _blobs.push(resBlob);
                        if (_next_offset < _total_size) {
                            _next_offset += resBlob.size;
                            fetchNextPart(); // Fetch next part of the video
                        } else {
                            saveFile(new Blob(_blobs), fileName);
                            resolve(); // Resolve the promise when done
                        }
                    })
                    .catch((error) => {
                        logger.error(error);
                        resolve(); // Resolve even on error to allow next downloads
                    });
            };

            fetchNextPart(); // Start fetching video parts
        });
    };

    const saveFile = (blob, fileName) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        logger.info(`Download triggered for ${fileName}`);
    };

    // Add event listener for download button clicks
    document.addEventListener('click', (event) => {
        if (event.target.matches('.tel-download-button')) {
            const videoUrl = event.target.getAttribute('data-video-url');
            downloadQueue.push({ url: videoUrl }); // Add to queue
            processQueue(); // Start processing the queue
        }
    });

    logger.info("Initialized");
})();
