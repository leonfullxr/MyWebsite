document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const languageSelect = document.getElementById('language-select');

    const contentData = {
        en: `
            <div class="header">
                <h1>Leon Elliott Fuller</h1>
                <p>Email: <a href="mailto:l.elliottfuller@gmail.com">l.elliottfuller@gmail.com</a></p>
                <p>Address: Marbella, Spain</p>
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
                        <h3>Computer Engineering <span class="location">Granada, Spain</span></h3>
                        <p>Specialized in Computing and Intelligent Systems <span class="date">Sep. 2021 - Present</span></p>
                    </div>
                    <ul>
                        <li>Coursework: AI, Machine Learning, Networking, and Cybersecurity.</li>
                        <li>Honors: Calculus, Statistics, and Programming.</li>
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

            <!-- Skills Section -->
            <div class="section">
                <h2>Technical Skills</h2>
                <ul>
                    <li>Parallel Programming - OpenMP</li>
                    <li>3D graphical programming - OpenGL</li>
                    <li>Competitive Programming and Game Jam Participation</li>
                    <li>Technical Experience: Machine Learning, Deep Learning, Cybersecurity, Web development and Game Development</li>
                    <li>Proficiency in C++, Python, and Godot Game Engine</li>
                    <li>Software Development Projects: C, C++, Python and Java</li>
                    <li>Criptography - Elliptic curves</li>
                </ul>
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
                <h2>Personal Details</h2>
                <p>LinkedIn: <a href="https://www.linkedin.com/in/leon-elliott-fuller">Leon Elliott Fuller</a></p>
                <p>GitHub: <a href="https://github.com/Leonfullxr">Leonfullxr</a></p>
            </div>
            <div class="section">
            <h2>Languages</h2>
            <ul>
                <li>English - Native</li>
                <li>Spanish - Native</li>
                <li>French - Basic</li>
            </ul>
        </div>
        `,
        es: `
            <div class="header">
                <h1>Leon Elliott Fuller</h1>
                <p>Email: <a href="mailto:l.elliottfuller@gmail.com">l.elliottfuller@gmail.com</a></p>
                <p>Direccion: Marbella, Espana</p>
                <p>Actualmente finalizando mi ultimo ano en Ingenieria Informatica, estudiando en Polonia</p>
            </div>
            <div class="section">
                <h2>Perfil</h2>
                <p>Mientras continuo mis estudios, tambien busco adquirir experiencia practica en el ambito laboral y establecer una base solida para mi futura carrera. A traves de esto, pretendo fortalecer mis conocimientos y habilidades. En ultima instancia, mi objetivo es recibir formacion para trabajar en un rol organizativo dentro de una empresa.</p>
                <p>Me encanta conocer gente nueva, descubrir nuevos lugares, viajar y practicar deportes. A menudo participo en varias carreras, a veces con amigos por diversion. ¡Me encanta descubrir y aprender cosas nuevas!</p>
            </div>

            <!-- Education Section -->
            <div class="section">
                <h2>Educacion</h2>
                <div class="education-entry">
                    <div class="education-header">
                        <h3>Ingenieria Informatica <span class="location">Granada, Espana</span></h3>
                        <p>Especializado en Computacion y Sistemas Inteligentes <span class="date">Sep. 2021 - Presente</span></p>
                    </div>
                    <ul>
                        <li>Asignaturas: IA, Aprendizaje Automatico, Redes y Ciberseguridad.</li>
                        <li>Honores: Calculo, Estadistica y Programacion.</li>
                    </ul>
                </div>
            </div>

            <!-- Experience Section -->
            <div class="section">
                <h2>Experiencia</h2>
                <div class="experience-entry">
                    <div class="experience-header">
                        <h3>Consultoria de Clientes Privados <span class="location">Malaga, Espana</span></h3>
                        <p>Consultor de TI · Tiempo completo <span class="date">Jul. 2022 - Sep. 2023</span></p>
                    </div>
                    <p>Trabaje como Consultor de TI durante el verano, ayudando a los empleados con problemas de TI, creando una aplicacion de escritorio para la empresa, configurando la autenticacion de dos factores de la empresa y manteniendo el servicio de TI de la empresa.</p>
                </div>
            </div>

            <!-- Skills Section -->
            <div class="section">
                <h2>Habilidades Tecnicas</h2>
                <ul>
                    <li>Programacion Paralela - OpenMP</li>
                    <li>Programacion Grafica 3D - OpenGL</li>
                    <li>Participacion en Programacion Competitiva y Game Jams</li>
                    <li>Experiencia Tecnica: Aprendizaje Automatico, Aprendizaje Profundo, Ciberseguridad, Desarrollo Web y Desarrollo de Videojuegos</li>
                    <li>Competencia en C++, Python y Godot Game Engine</li>
                    <li>Proyectos de Desarrollo de Software: C, C++, Python y Java</li>
                    <li>Cristografia - Curvas Elipticas</li>
                </ul>
            </div>

            <!-- Projects Section -->
            <div class="section">
                <h2>Proyectos y Eventos</h2>
                <div class="project-entry">
                    <div class="project-header">
                        <h3><a href="https://github.com/leonfullxr/Pichola">GameJam - Pichola</a> <span class="location">Granada, Espana</span></h3>
                        <p>Proyecto de Desarrollo de Juegos <span class="date">Ene. 2022</span></p>
                    </div>
                    <ul>
                        <li>Participe en un evento de GameJam con el tema "empezar desde cero".</li>
                        <li>Usamos Godot Engine para crear el juego 2D en 48 horas.</li>
                        <li>1º lugar en la categoria 'Mejor Arte'.</li>
                        <li>3º lugar en la categoria 'Mejor Potencial Comercial'.</li>
                        <li>3º lugar en la categoria 'Mas Popular'.</li>
                        <li>Para mas informacion, visita la <a href="https://itch.io/jam/student-game-jam/rate/1966784">pagina en itch.io</a>.</li>
                    </ul>
                </div>
            </div>

            <!-- Certificates Section -->
            <div class="section">
                <h2>Certificados</h2>
                <div class="certificate-entry">
                    <div class="certificate-header">
                        <h3>Aprendizaje Automatico y Big Data para Bioinformatica <span class="location">Granada, Espana</span></h3>
                        <p>Universidad de Granada <span class="date">Enero - Junio 2024</span></p>
                    </div>
                    <ul>
                        <li>Un <a href="https://abierta.ugr.es/course/view.php?id=74">programa patrocinado por la Universidad</a> sobre Aprendizaje Automatico y Big Data enfocado en Bioinformatica, desarrollando metodos y herramientas de software para comprender datos biologicos.</li>
                        <li>Creé un proyecto detallado de <a href="https://github.com/leonfullxr/Classifying-Mushrooms.git">Clasificacion de Hongos</a> relacionado con este programa.</li>
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
                <h2>Datos Personales</h2>
                <p>LinkedIn: <a href="https://www.linkedin.com/in/leon-elliott-fuller">Leon Elliott Fuller</a></p>
                <p>GitHub: <a href="https://github.com/Leonfullxr">Leonfullxr</a></p>
            </div>
            <div class="section">
                <h2>Idiomas</h2>
                <ul>
                    <li>Ingles - Nativo</li>
                    <li>Español - Nativo</li>
                    <li>Frances - Basico</li>
                </ul>
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