document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const languageSelect = document.getElementById('language-select');

    const contentData = {
        en: `
            <div class="header">
                <h1>Leon Elliott Fuller</h1>
                <p>Email: <a href="mailto:l.elliottfuller@gmail.com">l.elliottfuller@gmail.com</a></p>
                <p>Address: Grzegórzecka 20A, 31-532 Kraków, Poland</p>
                <p>Currently finishing my last year in Computer Engineering, studying abroad in Poland</p>
            </div>
            <div class="section">
                <h2>Profile</h2>
                <p>While I am currently pursuing my studies, I am also seeking to gain practical experience in the workforce and establish a solid foundation for my future career. Through this, I aim to strengthen my knowledge and skills. Ultimately, my goal is to receive training to work in an organizational role within a company.</p>
                <p>I love meeting new people, discovering new places, travelling and sports. I often do several running races, sometimes with friends for fun, I just love discovering and learning new things! </p>
            </div>

            <!-- Education Section -->
            <div class="section">
                <h2>Education</h2>
                <div class="education-entry">
                    <div class="education-header">
                        <h3>Erasmus+ Student at AGH Univeristy of Krakow <span class="location">Kraków, Poland</span></h3>
                        <p>Finishing my university studies abroad in Computer Science <span class="date">Sep 2024 - Present</span></p>
                    </div>
                    <ul>
                        <li>Coursework: Computer Vision, Deep Learning in Medical Image Analysis, Cybersecurity, Real Time Operating Systems in C and Cloud Computing.</li>
                    </ul>
                </div>
                <div class="education-entry">
                    <div class="education-header">
                        <h3>Computer Engineering <span class="location">Granada, Spain</span></h3>
                        <p>Specialized in Computing and Intelligent Systems <span class="date">Sep. 2021 - Present</span></p>
                    </div>
                    <ul>
                        <li>Coursework: AI, Machine Learning, Networking, C++, Python, OOP, Graphical Design using OpenGL, and Cybersecurity.</li>
                        <li>Honors: Calculus, Statistics, Machine Learning, and Programming.</li>
                    </ul>
                </div>
            </div>

            <!-- Experience Section -->
            <div class="section">
                <h2>Experience</h2>
                <div class="experience-entry">
                    <div class="experience-header">
                        <h3>Private Client Consultancy <span class="location">Malaga, Spain</span></h3>
                        <p>IT Consultant · Full-time <span class="date">July 2022 - Sep. 2023</span></p>
                    </div>
                    <p>I worked as an IT Consultant for the summer, helping out the workers with their IT issues, partly creating a Desktop App for the company, setting up the company's 2FA and generally maintaining the company's IT service.</p>
                </div>
            </div>

            <!-- Projects Section -->
            <div class="section">
                <h2>Projects & Events</h2>
                <div class="project-entry">
                    <div class="project-header">
                        <h3><a href="https://github.com/leonfullxr/Pichola">GameJam - Pichola</a> <span class="location">Granada, Spain</span></h3>
                        <p>Game Development Project <span class="date">Jan. 2022</span></p>
                    </div>
                    <ul>
                        <li>Participated in a GameJam event, the theme was "start from nothing".</li>
                        <li>We used Godot Engine to create the 2D game in 48 hours.</li>
                        <li> 1º place in the 'Best Art' category.</li>
                        <li> 3º place in the 'Best Commercial Potential' category.</li>
                        <li> 3º place in the 'Most Popular' category.</li>
                        <li>For more information, visit the <a href="https://itch.io/jam/student-game-jam/rate/1966784">itch.io page</a>.</li>
                    </ul>
            </div>

            <!-- Certificates Section -->
            <div class="section">
                <h2>Certificates</h2>
                <div class="certificate-entry">
                    <div class="certificate-header">
                        <h3>AWS Academy Cloud Developing <span class="location">Krakow, Poland</span></h3>
                        <p><a href="https://www.credly.com/badges/88aa1ef1-aa4f-4202-9739-75d974af1a1b/linked_in_profile">Amazon Web Services (AWS) - Certificate</a> <span class="date">November 2024</span></p>
                    </div>
                    <ul>
                        <li>Learned how to design, develop, and deploy cloud-based solutions using AWS.</li>
                        <li>Developed a <a href="https://docs.google.com/document/d/1Wbxl2npoqENX2HGI253hoDC6QvVw2TH4mAmL73aasCM/edit?usp=sharing">End to end AWS Web Application</a> related to this program.</li>
                    </ul>
                </div>
                <div class="certificate-entry">
                    <div class="certificate-header">
                        <h3>Machine Learning and Big Data for BioInformatics <span class="location">Granada, Spain</span></h3>
                        <p>University of Granada <span class="date">January - June 2024</span></p>
                    </div>
                    <ul>
                        <li>A <a href="https://abierta.ugr.es/course/view.php?id=74">University-Sponsored Machine Learning and Big Data program</a>, covering various topics of ML focused on BioInformatics, developing methods and software tools for understanding biological data.</li>
                        <li>Created a detailed <a href="https://github.com/leonfullxr/Classifying-Mushrooms.git">Mushroom Classification</a> project related to this program.</li>
                    </ul>
                </div>
                <div class="certificate-entry">
                    <div class="certificate-header">
                        <h3>Video game &amp; Entrepreneurship Program <span class="location">Marbella, Spain</span></h3>
                        <p><a href="https://incyde.org/">Incyde Foundation</a> <span class="date">July - August 2020</span></p>
                    </div>
                    <ul>
                        <li>An intro to Unity on how to manage and create games.</li>
                        <li>Created a 3D shooter FPS game in Unity.</li>
                        <li>Conducted a study of how to take advantage of publishing the game onto the market.</li>
                        <li>Analized and studied the market to understand how to promote a product. </li>
                    </ul>
                </div>
            </div>

            <div class="section">
                <h2>Interests</h2>
            <ul>
                <li>Proud dog owner</li>
                <li>Professional mediocre marathon runner</li>
                <li>Mountain and nature lover</li>
                <li>Completed over 400 hours of meditation after discovering memory leaks</li>
                </ul>
            <div class="section">
                <h2>Personal Details</h2>
                <p>LinkedIn: <a href="www.linkedin.com/in/leon-elliott-fuller-b48b7123a">Leon Elliott Fuller</a></p>
                <p>GitHub: <a href="https://github.com/Leonfullxr">Leonfullxr</a></p>
            </div>
        </div>
        `,
        es: `
            <div class="header">
                <h1>Leon Elliott Fuller</h1>
                <p>Email: <a href="mailto:l.elliottfuller@gmail.com">l.elliottfuller@gmail.com</a></p>
                <p>Dirección: Grzegórzecka 20A, 31-532 Cracovia, Polonia</p>
                <p>Actualmente terminando mi último año de Ingeniería Informática, estudiando en el extranjero en Polonia</p>
            </div>
            <div class="section">
                <h2>Perfil</h2>
                <p>Mientras termino mis estudios, también busco ganar experiencia práctica en el ámbito laboral y establecer una base sólida para mi futura carrera. A través de esto, busco fortalecer mis conocimientos y habilidades. Mi objetivo final es recibir formación para trabajar en un rol organizativo dentro de una empresa.</p>
                <p>Me encanta conocer gente nueva, descubrir nuevos lugares, viajar y practicar deportes. A menudo participo en varias carreras, a veces con amigos por diversión. ¡Me encanta descubrir y aprender cosas nuevas!</p>
            </div>

            <!-- Sección de Educación -->
            <div class="section">
                <h2>Educación</h2>
                <div class="education-entry">
                    <div class="education-header">
                        <h3>Erasmus+ Estudiante en la Universidad AGH de Cracovia <span class="location">Cracovia, Polonia</span></h3>
                        <p>Terminando mis estudios universitarios en el extranjero en Ciencias de la Computación <span class="date">Sept 2024 - Presente</span></p>
                    </div>
                    <ul>
                        <li>Cursos: Visión por Computador, Aprendizaje Profundo en Análisis de Imágenes Médicas, Ciberseguridad, Sistemas Operativos en Tiempo Real en C y Computación en la Nube.</li>
                    </ul>
                </div>
                <div class="education-entry">
                    <div class="education-header">
                        <h3>Ingeniería Informática <span class="location">Granada, España</span></h3>
                        <p>Especializado en Computación y Sistemas Inteligentes <span class="date">Septiembre 2021 - Presente</span></p>
                    </div>
                    <ul>
                        <li>Cursos: IA, Aprendizaje Automático, Redes, C++, Python, POO, Diseño Gráfico usando OpenGL, y Ciberseguridad.</li>
                        <li>Reconocimientos: Cálculo, Estadística, Aprendizaje Automático, y Programación.</li>
                    </ul>
                </div>
            </div>

            <!-- Sección de Experiencia -->
            <div class="section">
                <h2>Experiencia</h2>
                <div class="experience-entry">
                    <div class="experience-header">
                        <h3>Consultoría a Clientes Privados <span class="location">Málaga, España</span></h3>
                        <p>Consultor de TI · Tiempo completo <span class="date">Julio 2022 - Septiembre 2023</span></p>
                    </div>
                    <p>Trabajé como consultor de TI durante el verano, ayudando a los empleados con sus problemas de TI, desarrollando parcialmente una aplicación de escritorio para la empresa, configurando la autenticación de dos factores de la empresa y, en general, manteniendo el servicio de TI de la empresa.</p>
                </div>
            </div>

            <!-- Sección de Proyectos -->
            <div class="section">
                <h2>Proyectos y Eventos</h2>
                <div class="project-entry">
                    <div class="project-header">
                        <h3><a href="https://github.com/leonfullxr/Pichola">GameJam - Pichola</a> <span class="location">Granada, España</span></h3>
                        <p>Proyecto de Desarrollo de Videojuegos <span class="date">Enero 2022</span></p>
                    </div>
                    <ul>
                        <li>Participé en un evento de GameJam, el tema fue "comenzar desde cero".</li>
                        <li>Usamos Godot Engine para crear el juego 2D en 48 horas.</li>
                        <li>1º lugar en la categoría 'Mejor Arte'.</li>
                        <li>3º lugar en la categoría 'Mejor Potencial Comercial'.</li>
                        <li>3º lugar en la categoría 'Más Popular'.</li>
                        <li>Para más información, visita la <a href="https://itch.io/jam/student-game-jam/rate/1966784">página de itch.io</a>.</li>
                    </ul>
            </div>

            <!-- Sección de Certificados -->
            <div class="section">
                <h2>Certificados</h2>
                <div class="certificate-entry">
                    <div class="certificate-header">
                        <h3>AWS Academy Cloud Developing <span class="location">Cracovia, Polonia</span></h3>
                        <p><a href="https://www.credly.com/badges/88aa1ef1-aa4f-4202-9739-75d974af1a1b/linked_in_profile">Amazon Web Services (AWS) - Certificado</a> <span class="date">Noviembre 2024</span></p>
                    </div>
                    <ul>
                        <li>Aprendí a diseñar, desarrollar y desplegar soluciones basadas en la nube usando AWS.</li>
                        <li>Desarrollé una <a href="https://docs.google.com/document/d/1Wbxl2npoqENX2HGI253hoDC6QvVw2TH4mAmL73aasCM/edit?usp=sharing">Aplicación Web AWS de extremo a extremo</a> relacionada con este programa.</li>
                    </ul>
                </div>
                <div class="certificate-entry">
                    <div class="certificate-header">
                        <h3>Aprendizaje Automático y Big Data para Bioinformática <span class="location">Granada, España</span></h3>
                        <p>Universidad de Granada <span class="date">Enero - Junio 2024</span></p>
                    </div>
                    <ul>
                        <li>Un <a href="https://abierta.ugr.es/course/view.php?id=74">programa universitario patrocinado</a>, que cubre varios temas de Aprendizaje Automático enfocados en Bioinformática.</li>
                        <li>Creé un proyecto detallado de <a href="https://github.com/leonfullxr/Classifying-Mushrooms.git">Clasificación de Hongos</a> relacionado con este programa.</li>
                    </ul>
                </div>
                <div class="certificate-entry">
                    <div class="certificate-header">
                        <h3>Programa de Videojuegos y Emprendimiento <span class="location">Marbella, Espana</span></h3>
                        <p><a href="https://incyde.org/">Fundacion Incyde</a> <span class="date">Julio - Agosto 2020</span></p>
                    </div>
                    <ul>
                        <li>Introduccion a Unity sobre como gestionar y crear videojuegos.</li>
                        <li>Creé un juego FPS 3D en Unity.</li>
                        <li>Realice un estudio sobre como lanzar el juego al mercado.</li>
                        <li>Analice y estude el mercado para entender como promocionar un producto.</li>
                    </ul>
                </div>
            </div>

            <div class="section">
                <h2>Intereses</h2>
                <ul>
                    <li>Dueño orgulloso de un perro</li>
                    <li>Corredor mediocre profesional de maratones</li>
                    <li>Amante de la montaña y la naturaleza</li>
                    <li>He completado más de 400 horas de meditación tras descubrir fallos de memoria</li>
                </ul>
            <div class="section">
                <h2>Detalles Personales</h2>
                <p>LinkedIn: <a href="www.linkedin.com/in/leon-elliott-fuller-b48b7123a">Leon Elliott Fuller</a></p>
                <p>GitHub: <a href="https://github.com/Leonfullxr">Leonfullxr</a></p>
            </div>
        </div>
        `
    };

    function setContent(language) {
        content.innerHTML = contentData[language];
    }

    languageSelect.addEventListener('change', (e) => {
        setContent(e.target.value);
    });

    // Set initial content based on default selection
    setContent(languageSelect.value);
});