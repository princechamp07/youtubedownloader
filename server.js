const express = require('express');
const ytdl = require('@distube/ytdl-core');
const app = express();
const port = 3000;

// Function to sanitize the video title for use in HTTP headers
const sanitizeTitle = (title) => {
  return title.replace(/[^\w\s.-]/g, '_'); // Replace invalid characters with underscores
};

// Route to fetch available formats for a video
app.get('/formats', async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).send('Error: No URL provided');
  }

  try {
    // Fetch video information
    const info = await ytdl.getInfo(videoUrl);

    // Extract all formats
    const formats = info.formats.map(format => ({
      itag: format.itag,
      quality: format.qualityLabel || 'Audio only',
      type: format.hasAudio && format.hasVideo ? 'Video' : 'Audio',
      resolution: format.resolution || 'N/A',
      mimeType: format.mimeType
    }));

    // Return all formats as a JSON response
    res.json(formats);
  } catch (error) {
    console.error('Error fetching video formats:', error);
    res.status(500).send('Error: Unable to fetch video formats');
  }
});

// Route to download a selected format
app.get('/download', async (req, res) => {
  const videoUrl = req.query.url;
  const itag = req.query.itag;

  if (!videoUrl || !itag) {
    return res.status(400).send('Error: Missing URL or format (itag) parameter');
  }

  try {
    // Fetch video information
    const info = await ytdl.getInfo(videoUrl);
    
    // Find the selected format based on 'itag'
    const format = info.formats.find(f => f.itag === parseInt(itag));

    if (!format) {
      return res.status(400).send('Error: Invalid format (itag) selected');
    }

    // Sanitize the video title for use in the content-disposition header
    const sanitizedTitle = sanitizeTitle(info.videoDetails.title);

    // Set appropriate headers for file download
    res.header('Content-Disposition', `attachment; filename="${sanitizedTitle}.${format.container || 'mp4'}"`);

    // Stream the selected format to the user
    ytdl(videoUrl, { format: format })
      .pipe(res)
      .on('finish', () => {
        console.log('Download finished');
      });
  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).send('Error: Unable to download video');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
