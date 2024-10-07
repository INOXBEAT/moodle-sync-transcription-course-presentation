window.onload = function () {
    const h5pContent = document.querySelector('.h5p-iframe-wrapper iframe'); // Identifica el iframe del contenido H5P

    if (h5pContent) {
        console.log('Iframe H5P encontrado.');

        const interval = setInterval(function () {
            let h5pDocument;

            try {
                h5pDocument = h5pContent.contentDocument || h5pContent.contentWindow.document;
            } catch (error) {
                console.error('Error accediendo al contenido del iframe:', error.message);
                return;
            }

            if (h5pDocument && h5pDocument.readyState === 'complete') {
                console.log('Contenido H5P cargado.');
                clearInterval(interval); // Eliminar el intervalo al cargar el contenido

                // Añadir Bootstrap 5 al documento
                const link = h5pDocument.createElement('link');
                link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css";
                link.rel = "stylesheet";
                link.crossOrigin = "anonymous";
                h5pDocument.head.appendChild(link);

                console.log('Bootstrap 5 agregado al documento.');

                // Identificar las diapositivas de la presentación
                const slides = h5pDocument.querySelectorAll('.h5p-slide');

                if (slides.length > 0) {
                    console.log(`Se han encontrado ${slides.length} diapositivas en la presentación.`);

                    let currentSlideIndex = -1; // Rastreo de diapositiva actual
                    let currentVideo = null;  // Rastreo del video actualmente sincronizado

                    // Función para manejar el cambio de diapositiva
                    const handleSlideChange = () => {
                        slides.forEach((slide, index) => {
                            if (slide.classList.contains('h5p-current')) {
                                if (currentSlideIndex !== index) {
                                    currentSlideIndex = index;

                                    // Log para indicar la diapositiva actual
                                    console.log(`--- Diapositiva actual: ${index + 1} ---`);

                                    // Determinar si la diapositiva contiene un video o una imagen
                                    const videoElement = slide.querySelector('video');
                                    const imgElement = slide.querySelector('img');

                                    if (videoElement) {
                                        console.log(`Diapositiva ${index + 1}: Contiene un video.`);
                                        const trackElement = videoElement.querySelector('track');
                                        if (trackElement) {
                                            console.log(`Diapositiva ${index + 1}: El video tiene subtítulos.`);

                                            const vttSrc = trackElement.getAttribute('src');
                                            if (vttSrc) {
                                                fetch(vttSrc)
                                                    .then(response => response.text())
                                                    .then(vttData => {
                                                        console.log(`Contenido del track (subtítulos) en la diapositiva ${index + 1}:\n${vttData}`); // Imprimir el contenido del archivo VTT en el log

                                                        const captions = processVTT(vttData);
                                                        const container = createGridLayout(h5pDocument, slide, videoElement, captions);

                                                        slide.innerHTML = ''; // Limpiar la diapositiva actual
                                                        slide.appendChild(container); // Añadir el nuevo grid

                                                        // Desincronizar el video anterior si lo hubiera
                                                        if (currentVideo) {
                                                            console.log('Eliminando el evento timeupdate del video anterior.');
                                                            currentVideo.removeEventListener('timeupdate', syncEventHandler);
                                                        }

                                                        // Sincronizar subtítulos con el nuevo video
                                                        syncSubtitles(videoElement, captions, h5pDocument);
                                                        currentVideo = videoElement;
                                                    })
                                                    .catch(error => console.error(`Error al obtener el archivo VTT: ${error.message}`));
                                            } else {
                                                console.log(`Diapositiva ${index + 1}: El video no tiene subtítulos.`);
                                            }
                                        } else {
                                            console.log(`Diapositiva ${index + 1}: El video no tiene subtítulos.`);
                                        }
                                    } else if (imgElement) {
                                        console.log(`Diapositiva ${index + 1}: Contiene una imagen.`);
                                    } else {
                                        console.log(`Diapositiva ${index + 1}: Contenido desconocido.`);
                                    }
                                }
                            }
                        });
                    };

                    // Crear un MutationObserver para observar cambios en las diapositivas
                    const observer = new MutationObserver(handleSlideChange);
                    slides.forEach(slide => {
                        observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
                    });

                    // Ejecutar la función una vez al cargar
                    handleSlideChange();
                } else {
                    console.log('No se encontraron diapositivas en la presentación.');
                }
            } else {
                console.log('Esperando que el contenido del iframe se cargue completamente...');
            }
        }, 500); // Intentar cada 500ms
    } else {
        console.log('No se encontró ningún iframe con la clase h5p-iframe-wrapper.');
    }

    // Procesar el archivo VTT y extraer los subtítulos
    function processVTT(vttData) {
        const lines = vttData.split('\n');
        const captions = [];
        let currentCaption = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === 'WEBVTT') continue;

            if (line.includes('-->')) {
                const times = line.split(' --> ');
                currentCaption = {
                    start: parseTime(times[0].trim()),
                    end: parseTime(times[1].trim()),
                    text: ''
                };
            } else if (line.length > 0) {
                currentCaption.text += line + ' ';
            }

            if ((line.length === 0 || i === lines.length - 1) && currentCaption.text) {
                captions.push(currentCaption);
                currentCaption = {};
            }
        }

        return captions;
    }

    // Convertir el formato de tiempo "MM:SS.milliseconds" a segundos
    function parseTime(timeString) {
        const timeParts = timeString.split(":");
        if (timeParts.length === 2) {
            const minutes = parseInt(timeParts[0], 10) * 60;
            const secondsParts = timeParts[1].split('.');
            const seconds = parseInt(secondsParts[0], 10);
            const milliseconds = secondsParts[1] ? parseInt(secondsParts[1], 10) / 1000 : 0;
            return minutes + seconds + milliseconds;
        }
        return 0;
    }

    // Crear el grid layout para el video y los subtítulos
    function createGridLayout(document, slide, videoElement, captions) {
        const container = document.createElement('div');
        container.classList.add('container', 'mt-4');

        const row = document.createElement('div');
        row.classList.add('row');

        // Columna de video (col-8)
        const colVideo = document.createElement('div');
        colVideo.classList.add('col-12', 'col-md-8');
        colVideo.appendChild(videoElement);
        row.appendChild(colVideo);

        // Columna de subtítulos (col-4)
        const colText = document.createElement('div');
        colText.classList.add('col-12', 'col-md-4');
        colText.id = 'captions-container';
        colText.style.overflowY = 'auto';
        colText.style.maxHeight = '520px';

        // Crear subtítulos interactivos
        captions.forEach((caption, index) => {
            const captionElement = document.createElement('span');
            captionElement.id = `caption-${index}`;
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

    // Sincronizar los subtítulos con el video
    let syncEventHandler; // Definir el event handler para eliminarlo después si es necesario

    function syncSubtitles(videoElement, captions, document) {
        let isUserInteracting = false;
        let inactivityTimeout;

        // Evento de sincronización que se ejecuta cuando cambia el tiempo del video
        syncEventHandler = () => {
            const currentTime = videoElement.currentTime;

            // Log para verificar si el evento timeupdate se está ejecutando
            console.log(`timeupdate ejecutado, tiempo actual: ${currentTime.toFixed(2)} segundos`);

            captions.forEach((caption, index) => {
                const captionElement = document.getElementById(`caption-${index}`);

                // Verificar si el tiempo actual está dentro del rango del subtítulo (start y end)
                if (currentTime >= caption.start && currentTime <= caption.end) {
                    captionElement.style.fontWeight = 'bold';
                    captionElement.style.backgroundColor = '#a9c1c7';

                    // Auto-scroll al subtítulo resaltado si el usuario no está interactuando
                    if (!isUserInteracting) {
                        const colText = document.getElementById('captions-container');
                        const containerHeight = colText.clientHeight;
                        const elementOffset = captionElement.offsetTop;
                        const elementHeight = captionElement.offsetHeight;

                        // Calcular la nueva posición de scroll
                        const scrollTo = elementOffset - (containerHeight / 2) + (elementHeight / 2);
                        colText.scrollTo({ top: scrollTo, behavior: 'smooth' });
                    }
                } else {
                    // Desactivar el resaltado si el subtítulo ya no está en el rango
                    captionElement.style.fontWeight = 'normal';
                    captionElement.style.backgroundColor = 'transparent';
                }
            });
        };

        // Añadir el evento timeupdate para la sincronización
        videoElement.addEventListener('timeupdate', syncEventHandler);

        // Control de inactividad del usuario para detener el auto-scroll
        const resetInactivityTimer = () => {
            isUserInteracting = true;
            clearTimeout(inactivityTimeout);
            inactivityTimeout = setTimeout(() => {
                isUserInteracting = false;
            }, 3500); // 3.5 segundos de inactividad
        };

        // Detectar interacciones del usuario en el contenedor de subtítulos
        const colText = document.getElementById('captions-container');
        colText.addEventListener('scroll', resetInactivityTimer);
        colText.addEventListener('mousemove', resetInactivityTimer);
    }
};
