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

                // Identificar las diapositivas de la presentación
                const slides = h5pDocument.querySelectorAll('.h5p-slide'); // Asegúrate de usar el selector adecuado para las diapositivas

                if (slides.length > 0) {
                    console.log(`Se han encontrado ${slides.length} diapositivas en la presentación.`);

                    let currentSlideIndex = -1;  // Para rastrear la diapositiva actual

                    // Función para detectar diapositiva activa y generar el log correspondiente
                    const handleSlideChange = () => {
                        slides.forEach((slide, index) => {
                            if (slide.classList.contains('h5p-current')) {
                                if (currentSlideIndex !== index) {  // Solo log cuando cambie de diapositiva
                                    currentSlideIndex = index;
                                    console.log(`Diapositiva actual: ${index + 1}`);
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
