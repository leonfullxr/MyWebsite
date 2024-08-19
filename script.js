document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const languageSelect = document.getElementById('language-select');

    const contentData = {
        en: `
            <div class="header">
                <h1>Leon Elliott Fuller</h1>
                <p>21 year old bilingual computer engineer</p>
                <p>Email: <a href="mailto:l.elliottfuller@gmail.com">l.elliottfuller@gmail.com</a></p>
                <p>Address: Marbella, Spain</p>
                <p>--> Currently finishing my last year in Computer Engineering, studying abroad in Poland</p>
            </div>
            <div class="section">
                <h2>Profile</h2>
                <p>While I am currently pursuing my studies, I am also seeking to gain practical experience in the workforce and establish a solid foundation for my future career. Through this, I aim to strengthen my knowledge and skills. Ultimately, my goal is to receive training to work in an organizational role within a company.</p>
                <p>I love meeting new people, discovering new places, travelling and sports. I often do several running races, sometimes with friends for fun, I just love discovering and learning new things! </p>
            </div>
            <div class="section">
                <h2>Education</h2>
                <p><strong>Computer Engineering</strong> <em>Sep 2021 - Present</em></p>
                <p>UGR, Granada</p>
                <p>Currently finishing my third year of Computer Engineering at the University of Granada</p>
            </div>
            <div class="section">
                <h2>Employment</h2>
                <p><strong>IT Consultant</strong> <em>Jul 2022 - Sep 2022</em></p>
                <p>Private Client Consultancy · Full-time, Malaga</p>
                <p>I worked as an IT Consultant for the summer, helping out the workers with their IT issues, partly creating a Desktop App for the company, setting up the company's 2FA and generally maintaining the company's IT service.</p>
            </div>
            <div class="section">
                <h2>Technical Skills</h2>
                <ul>
                    <li>Parallel Programming - OpenMP</li>
                    <li>3D graphical programming - OpenGL</li>
                    <li>Competitive Programming and Game Jam Participation</li>
                    <li>Technical Experience: Machine Learning, Deep Learning, Cybersecurity, Web development and Game Development</li>
                    <li>Proficiency in C++, Python, and Godot Game Engine</li>
                    <li>Software Development Projects: C++, Python and Java</li>
                    <li>AI enthusiast</li>
                </ul>
            </div>
            <div class="section">
                <h2>Projects & Events</h2>
                <p>I have done various projects in C++ and participated in various competitive programming events and Game jams using Godot.</p>
            </div>

            <div class="section">
                <h2>Certificates</h2>
                <p><strong>Video game &amp; Entrepreneurship Program</strong> <em>July 2020</em></p>
                <p>I took a course from the Incyde Foundation that showed me the fundamentals of designing, creating, and managing video game projects in Unity, to launch them in the market, conducting a prior study of it.</p>
                <p><strong>Machine Learning and Big Data for BioInformatics</strong> <em>January-June 2024</em></p>
                <p>A University-Sponsored Machine Learning and Big data program, that covered various topics of ML focused on BioInformatics, developing methods and software tools for understanding biological data. I also, related with this program, created a detailed <a href="https://github.com/leonfullxr/Classifying-Mushrooms.git">Mushroom Classification</a> project.
                </p>
            </div>

            <div class="section">
                <h2>Personal Details</h2>
                <p>LinkedIn: <a href="https://www.linkedin.com/in/leon-elliott-fuller">Leon Elliott Fuller</a></p>
                <p>GitHub: <a href="https://github.com/Leonfullxr">Leonfullxr</a></p>
            </div>
            <div class="section">
            <h2>Idiomas</h2>
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
            <p>Ingeniero informático bilingüe de 21 años</p>
            <p>Email: <a href="mailto:l.elliottfuller@gmail.com">l.elliottfuller@gmail.com</a></p>
            <p>Dirección: Marbella, Spain</p>
            <p>--> Actualmente finalizando mi último año en Ingeniería Informática, estudiando en el extranjero en Polonia</p>
        </div>

        <div class="section">
            <h2>Perfil</h2>
            <p>Mientras continúo mis estudios, también busco adquirir experiencia práctica en el ámbito laboral y establecer una base sólida para mi futura carrera. A través de esto, pretendo fortalecer mis conocimientos y habilidades. En última instancia, mi objetivo es recibir formación para trabajar en un rol organizativo dentro de una empresa.</p>
            <p>Me encanta conocer gente nueva, descubrir nuevos lugares, viajar y practicar deportes. A menudo participo en varias carreras, a veces con amigos por diversión, ¡me encanta descubrir y aprender cosas nuevas!</p>
        </div>

        <div class="section">
            <h2>Educación</h2>
            <p><strong>Ingeniería Informática</strong> <em>Sep 2021 - Presente</em></p>
            <p>UGR, Granada</p>
            <p>Actualmente finalizando mi cuarto año de Ingeniería Informática en la Universidad de Granada, realizando un Erasmus en Polonia (estudiando en el extranjero)</p>
        </div>

        <div class="section">
            <h2>Empleo</h2>
            <p><strong>Consultor de TI</strong> <em>Jul 2022 - Sep 2022</em></p>
            <p>Consultoría de Clientes Privados · Tiempo completo, Málaga</p>
            <p>Trabajé como Consultor de TI durante el verano, ayudando con los problemas de TI de los empleados, en parte creando una aplicación de escritorio para la empresa, configurando la autenticación de dos factores de la empresa, añadiendo reglas de spam de correo electrónico y, en general, manteniendo el servicio de TI/Seguridad de la empresa.</p>
        </div>

        <div class="section">
            <h2>Habilidades Técnicas</h2>
            <ul>
                <li>Programación Paralela - OpenMP</li>
                <li>Programación gráfica 3D - OpenGL</li>
                <li>Participación en Programación Competitiva y Game Jam</li>
                <li>Experiencia Técnica: Aprendizaje Automático, Aprendizaje Profundo, Ciberseguridad, Desarrollo Web y Desarrollo de Videojuegos</li>
                <li>Competencia en C++, Python y Godot Game Engine</li>
                <li>Proyectos de Desarrollo de Software: C++, Python y Java</li>
                <li>Entusiasta de la IA</li>
            </ul>
        </div>

        <div class="section">
            <h2>Proyectos &amp; Eventos</h2>
            <p>He realizado varios proyectos en C++ y he participado en varios eventos de programación competitiva y Game jams utilizando Godot.</p>
        </div>

        <div class="section">
            <h2>Certificados</h2>
            <p><strong>Programa de Videojuegos &amp; Emprendimiento</strong> <em>Julio 2020</em></p>
            <p>Realicé un curso de la Fundación Incyde que me mostró los fundamentos de diseñar, crear y gestionar proyectos de videojuegos en Unity, para lanzarlos al mercado, realizando un estudio previo del mismo.</p>
            <p><strong>Aprendizaje Automático y Big Data para Bioinformática</strong> <em>Enero-Junio 2024</em></p>
            <p>Un programa de Aprendizaje Automático y Big Data patrocinado por la Universidad, que cubrió varios temas de ML enfocados en Bioinformática, desarrollando métodos y herramientas de software para comprender datos biológicos. También, relacionado con este programa, creé un proyecto detallado de <a href="https://github.com/leonfullxr/Classifying-Mushrooms.git">Clasificación de Hongos</a>.</p>
        </div>

        <div class="section">
            <h2>Datos Personales</h2>
            <p>LinkedIn: <a href="https://www.linkedin.com/in/leon-elliott-fuller">Leon Elliott Fuller</a></p>
            <p>GitHub: <a href="https://github.com/Leonfullxr">Leonfullxr</a></p>
        </div>

        <div class="section">
            <h2>Idiomas</h2>
            <ul>
                <li>Inglés - Nativo</li>
                <li>Español - Nativo</li>
                <li>Francés - Básico</li>
            </ul>
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
