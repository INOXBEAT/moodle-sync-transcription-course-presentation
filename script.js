window.onload = function () {
    // Buscar el iframe dentro del div con la clase 'h5p-iframe-wrapper'
    const h5pContent = document.querySelector('.h5p-iframe-wrapper iframe');

    if (h5pContent) {
        console.log('Iframe H5P encontrado.');

        // Verificar periódicamente si el contenido del iframe está cargado
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

                // Limpiar el intervalo cuando el contenido esté listo
                clearInterval(interval);

                // **Añadir Bootstrap 5 al documento**
                const link = h5pDocument.createElement('link');
                link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css";
                link.rel = "stylesheet";
                link.crossOrigin = "anonymous";
                h5pDocument.head.appendChild(link);

                console.log('Bootstrap 5 agregado al documento.');

                // Identificar las diapositivas de la presentación
                const slides = h5pDocument.querySelectorAll('.h5p-slide'); // Asegúrate de usar el selector adecuado para las diapositivas

                if (slides.length > 0) {
                    console.log(`Se han encontrado ${slides.length} diapositivas en la presentación.`);

                    let currentSlideIndex = -1;  // Para rastrear la diapositiva actual

                    // Función para detectar diapositiva activa, su contenido, y generar el log correspondiente
                    const handleSlideChange = () => {
                        slides.forEach((slide, index) => {
                            if (slide.classList.contains('h5p-current')) {
                                if (currentSlideIndex !== index) {  // Solo log cuando cambie de diapositiva
                                    currentSlideIndex = index;

                                    // Determinar el tipo de contenido de la diapositiva
                                    let contentType = "Desconocido";  // Inicializamos como desconocido
                                    const videoElement = slide.querySelector('video');
                                    const imgElement = slide.querySelector('img');

                                    if (videoElement) {
                                        contentType = "video";

                                        // Verificar si el video tiene subtítulos (track)
                                        const trackElement = videoElement.querySelector('track');
                                        if (trackElement) {
                                            console.log(`Diapositiva ${index + 1}: video con subtítulos.`);

                                            // Obtener el archivo VTT desde el src del <track>
                                            const vttSrc = trackElement.getAttribute('src');
                                            if (vttSrc) {
                                                // Hacer una petición para obtener el contenido del archivo VTT
                                                fetch(vttSrc)
                                                    .then(response => response.text())
                                                    .then(vttData => {
                                                        console.log(`Contenido del VTT (Diapositiva ${index + 1}):`);
                                                        console.log(vttData); // Imprimir el contenido del archivo VTT

                                                        // Crear un grid con Bootstrap 5
                                                        const container = h5pDocument.createElement('div');
                                                        container.classList.add('container', 'mt-4');

                                                        const row = h5pDocument.createElement('div');
                                                        row.classList.add('row');

                                                        // Columna para el video (col-8)
                                                        const colVideo = h5pDocument.createElement('div');
                                                        colVideo.classList.add('col-12', 'col-md-8');
                                                        colVideo.appendChild(videoElement); // Mover el video al col-8
                                                        row.appendChild(colVideo); // Añadir el video a la fila

                                                        // Columna para los subtítulos (col-4)
                                                        const colText = h5pDocument.createElement('div');
                                                        colText.classList.add('col-12', 'col-md-4');
                                                        colText.style.overflowY = 'auto'; // Scroll para subtítulos
                                                        colText.style.maxHeight = '520px'; // Limitar altura del contenedor de subtítulos

                                                        // Crear el contenido de subtítulos a partir del VTT
                                                        const subtitles = vttData.split('\n').filter(line => line && !line.startsWith('WEBVTT') && !line.includes('-->'));
                                                        subtitles.forEach(subtitleText => {
                                                            const p = h5pDocument.createElement('p');
                                                            p.textContent = subtitleText.trim();
                                                            colText.appendChild(p);
                                                        });

                                                        row.appendChild(colText); // Añadir los subtítulos a la fila

                                                        // Colocar el grid en la diapositiva
                                                        container.appendChild(row);
                                                        slide.innerHTML = ''; // Limpiar la diapositiva actual antes de insertar el grid
                                                        slide.appendChild(container); // Añadir el grid a la diapositiva
                                                    })
                                                    .catch(error => {
                                                        console.error(`Error al obtener el archivo VTT: ${error.message}`);
                                                    });
                                            } else {
                                                console.log('No se encontró el atributo src en la etiqueta <track>.');
                                            }
                                        } else {
                                            console.log(`Diapositiva ${index + 1}: video sin subtítulos.`);
                                        }
                                    } else if (imgElement) {
                                        contentType = "img";
                                        console.log(`Diapositiva ${index + 1}: img`);
                                    } else {
                                        const otherContent = slide.children; // Para otros posibles contenidos
                                        if (otherContent.length > 0) {
                                            contentType = otherContent[0].tagName.toLowerCase(); // Tomar el primer tag del contenido
                                        }
                                        console.log(`Diapositiva ${index + 1}: ${contentType}`);
                                    }
                                }
                            }
                        });
                    };

                    // Crear un MutationObserver para observar cambios en las clases de las diapositivas
                    const observer = new MutationObserver(handleSlideChange);

                    // Configurar el observer para observar cambios en los atributos (como la clase)
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
};
