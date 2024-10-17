window.onload = function () {
    const h5pContent = document.querySelector('.h5p-iframe-wrapper iframe');

    if (h5pContent) {
        const interval = setInterval(function () {
            let h5pDocument;

            try {
                h5pDocument = h5pContent.contentDocument || h5pContent.contentWindow.document;
            } catch (error) {
                console.error('Error accediendo al contenido del iframe:', error.message);
                return;
            }

            if (h5pDocument && h5pDocument.readyState === 'complete') {
                clearInterval(interval);

                const link = h5pDocument.createElement('link');
                link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css";
                link.rel = "stylesheet";
                link.crossOrigin = "anonymous";
                h5pDocument.head.appendChild(link);

                const isInteractiveVideo = h5pDocument.querySelector('.h5p-video-wrapper');
                const isCoursePresentation = h5pDocument.querySelector('.h5p-slide');

                if (isInteractiveVideo) {
                    console.log('Recurso identificado: Interactive Video');
                    initializeInteractiveVideo(h5pDocument);
                }

                if (isCoursePresentation) {
                    console.log('Recurso identificado: Course Presentation');
                    initializeCoursePresentation(h5pDocument);
                }
            }
        }, 500);
    }
};

function initializeInteractiveVideo(h5pDocument) {
    const h5pContainer = h5pDocument.querySelector('.h5p-content');
    if (!h5pContainer) return;

    const trackElements = h5pDocument.querySelectorAll('track');
    if (trackElements.length === 0) {
        console.log('No se encontró ninguna etiqueta <track> en el contenido H5P.');
        return;
    }

    const container = setupContainerLayout(h5pDocument, h5pContainer, 'captions-container-iv');

    trackElements.forEach(track => {
        const trackSrc = track.getAttribute('src');
        if (trackSrc) {
            fetch(trackSrc)
                .then(response => response.text())
                .then(vttData => {
                    const captions = processVTT(vttData);
                    setupCaptions(h5pDocument, captions, container, 'iv');

                    const videoElement = h5pDocument.querySelector('video');
                    if (videoElement) {
                        syncSubtitlesWithScroll(videoElement, captions, h5pDocument, 'iv');
                    }
                })
                .catch(error => console.error('Error al procesar el archivo .vtt:', error.message));
        }
    });
}

function initializeCoursePresentation(h5pDocument) {
    const slides = h5pDocument.querySelectorAll('.h5p-slide');
    if (slides.length === 0) return;

    let currentVideo = null;
    let syncEventHandler = null;

    const handleSlideChange = () => {
        const currentSlide = h5pDocument.querySelector('.h5p-current');

        if (currentSlide) {
            const slideIndex = Array.from(slides).indexOf(currentSlide);
            console.log(`--- Diapositiva actual: ${slideIndex + 1} ---`);

            if (currentVideo && syncEventHandler) {
                currentVideo.removeEventListener('timeupdate', syncEventHandler);
                syncEventHandler = null;
            }

            const videoElement = currentSlide.querySelector('video');
            const trackElement = videoElement ? videoElement.querySelector('track') : null;

            if (videoElement && trackElement) {
                console.log(`Diapositiva ${slideIndex + 1}: El video tiene subtítulos.`);

                const vttSrc = trackElement.getAttribute('src');
                if (vttSrc) {
                    fetch(vttSrc)
                        .then(response => response.text())
                        .then(vttData => {
                            const captions = processVTT(vttData);
                            const container = createGridLayout(h5pDocument, currentSlide, videoElement, captions, slideIndex);

                            currentSlide.innerHTML = '';
                            currentSlide.appendChild(container);

                            syncEventHandler = () => syncSubtitlesWithScroll(videoElement, captions, h5pDocument, 'slide', slideIndex);
                            videoElement.addEventListener('timeupdate', syncEventHandler);
                            currentVideo = videoElement;
                        })
                        .catch(error => console.error(`Error al obtener el archivo VTT: ${error.message}`));
                }
            } else {
                console.log(`Diapositiva ${slideIndex + 1}: El video no tiene subtítulos o no es un video.`);
            }
        }
    };

    const observer = new MutationObserver(handleSlideChange);
    slides.forEach(slide => {
        observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
    });

    handleSlideChange();
}

function setupContainerLayout(h5pDocument, h5pContainer, captionsContainerId) {
    const container = h5pDocument.createElement('div');
    container.classList.add('container-fluid');
    h5pDocument.body.appendChild(container);

    const row = h5pDocument.createElement('div');
    row.classList.add('row');
    container.appendChild(row);

    const colH5P = h5pDocument.createElement('div');
    colH5P.classList.add('col-12', 'col-sm-8');
    colH5P.style.maxHeight = '520px';
    colH5P.style.overflow = 'hidden';
    colH5P.appendChild(h5pContainer);
    row.appendChild(colH5P);

    const colText = h5pDocument.createElement('div');
    colText.classList.add('col-12', 'col-sm-4');
    colText.id = captionsContainerId;
    colText.style.overflowY = 'auto';
    colText.style.maxHeight = '520px';
    row.appendChild(colText);

    return colText;
}

function setupCaptions(h5pDocument, captions, colText, type) {
    colText.innerHTML = '';

    captions.forEach((caption, index) => {
        const captionElement = h5pDocument.createElement('span');
        captionElement.id = `caption-${type}-${index}`;
        captionElement.textContent = caption.text.trim();
        captionElement.style.fontSize = '24px';
        captionElement.style.display = 'block';
        captionElement.style.cursor = 'pointer';
        captionElement.onclick = function () {
            const videoElement = h5pDocument.querySelector('video');
            videoElement.currentTime = caption.start;
            videoElement.play();
        };
        colText.appendChild(captionElement);
    });
}

function processVTT(vttData) {
    const lines = vttData.split('\n');
    const captions = [];
    let currentCaption = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line === 'WEBVTT' || line === '') continue;

        if (line.match(/^[a-f0-9-]+$/) && i + 1 < lines.length) {
            i++; 
            line = lines[i].trim();
        }

        if (line.includes('-->')) {
            if (currentCaption) {
                captions.push(currentCaption);
            }
            const times = line.split(' --> ');
            currentCaption = {
                start: parseTime(times[0].trim()),
                end: parseTime(times[1].trim()),
                text: ''
            };
        } 
        else if (line.length > 0 && currentCaption) {
            currentCaption.text += line + ' ';
        }
    }

    if (currentCaption) captions.push(currentCaption);

    return captions;
}

function parseTime(timeString) {
    const timeParts = timeString.split(":");
    if (timeParts.length === 3) { 
        const hours = parseInt(timeParts[0], 10) * 3600;
        const minutes = parseInt(timeParts[1], 10) * 60;
        const secondsParts = timeParts[2].split('.');
        const seconds = parseInt(secondsParts[0], 10);
        const milliseconds = secondsParts[1] ? parseInt(secondsParts[1], 10) / 1000 : 0;
        return hours + minutes + seconds + milliseconds;
    } else if (timeParts.length === 2) { 
        const minutes = parseInt(timeParts[0], 10) * 60;
        const secondsParts = timeParts[1].split('.');
        const seconds = parseInt(secondsParts[0], 10);
        const milliseconds = secondsParts[1] ? parseInt(secondsParts[1], 10) / 1000 : 0;
        return minutes + seconds + milliseconds;
    }
    return 0;
}

function createGridLayout(document, slide, videoElement, captions, slideIndex) {
    const container = document.createElement('div');
    container.classList.add('container', 'mt-4');

    const row = document.createElement('div');
    row.classList.add('row');

    const colVideo = document.createElement('div');
    colVideo.classList.add('col-12', 'col-md-8');
    colVideo.appendChild(videoElement);
    row.appendChild(colVideo);

    const colText = document.createElement('div');
    colText.classList.add('col-12', 'col-md-4');
    colText.id = `captions-container-slide-${slideIndex}`;
    colText.style.overflowY = 'auto';
    colText.style.maxHeight = '520px';

    captions.forEach((caption, index) => {
        const captionElement = document.createElement('span');
        captionElement.id = `caption-slide-${slideIndex}-${index}`;
        captionElement.textContent = caption.text.trim();
        captionElement.style.display = 'block';
        captionElement.style.cursor = 'pointer';
        captionElement.onclick = () => {
            videoElement.currentTime = caption.start;
            videoElement.play();
        };
        colText.appendChild(captionElement);
    });

    row.appendChild(colText);
    container.appendChild(row);
    return container;
}

function syncSubtitlesWithScroll(videoElement, captions, h5pDocument, type, slideIndex = null) {
    const colTextId = slideIndex !== null ? `captions-container-slide-${slideIndex}` : `captions-container-${type}`;
    const colText = h5pDocument.getElementById(colTextId);
    console.log(`[${type}] Contenedor de subtítulos encontrado:`, colText ? "Sí" : "No");

    let isUserInteracting = false;
    let inactivityTimeout;

    const handleTimeUpdate = () => {
        const currentTime = videoElement.currentTime;
        if (!colText) return;

        captions.forEach((caption, index) => {
            const captionId = slideIndex !== null ? `caption-slide-${slideIndex}-${index}` : `caption-${type}-${index}`;
            const captionElement = h5pDocument.getElementById(captionId);
            if (!captionElement) return;

            if (currentTime >= caption.start && currentTime <= caption.end) {
                captionElement.style.fontWeight = 'bold';
                captionElement.style.backgroundColor = '#a9c1c7';

                if (!isUserInteracting) {
                    const scrollTo = captionElement.offsetTop - (colText.clientHeight / 2) + (captionElement.offsetHeight / 2);
                    colText.scrollTo({ top: scrollTo, behavior: 'smooth' });
                    console.log(`[${type}] Subtítulo centrado en índice ${index}`);
                }
            } else {
                captionElement.style.fontWeight = 'normal';
                captionElement.style.backgroundColor = 'transparent';
            }
        });
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    const resetInactivityTimer = () => {
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        isUserInteracting = true;

        inactivityTimeout = setTimeout(() => {
            isUserInteracting = false;
            console.log(`[${type}] Usuario inactivo. Centrando subtítulo nuevamente.`);
        }, 3500);
    };

    if (colText) {
        colText.addEventListener('scroll', resetInactivityTimer);
        colText.addEventListener('mousemove', resetInactivityTimer);
    }
}
