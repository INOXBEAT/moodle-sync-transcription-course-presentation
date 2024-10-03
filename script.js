document.addEventListener("DOMContentLoaded", function() {
    // Buscar el iframe dentro del div con la clase 'h5p-iframe-wrapper'
    const h5pContent = document.querySelector('.h5p-iframe-wrapper iframe');

    if (h5pContent) {
        console.log('Iframe H5P encontrado.');

        // Asegurarse de que el iframe ha terminado de cargar su contenido
        h5pContent.onload = function () {
            console.log('Iframe H5P ha cargado su contenido.');

            try {
                // Intentar acceder al contenido del iframe
                const h5pDocument = h5pContent.contentDocument || h5pContent.contentWindow.document;

                if (h5pDocument) {
                    console.log('Contenido H5P cargado.');
                    // Aquí agregar más lógica, como la detección del Course Presentation
                } else {
                    console.log('No se pudo acceder al contenido del iframe.');
                }
            } catch (error) {
                console.error('Error accediendo al contenido del iframe: ' + error.message);
            }
        };
    } else {
        console.log('No se encontró ningún iframe con la clase h5p-iframe-wrapper.');
    }
});
