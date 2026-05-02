// @ts-nocheck
// Static lexicon snapshots derived from corpus-backed multilingual frequency data.
// The ranked word bands are built from wordfreq's multilingual lists, which in turn
// aggregate multiple public corpora through Luminoso's Exquisite Corpus project.

function words(value) {
  return value
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function createEntries(words, config) {
  return words.map((term) => ({
    term,
    ...config,
  }));
}

function dedupeEntries(entries) {
  const entryMap = new Map();

  entries.forEach((entry) => {
    entryMap.set(entry.term.toLowerCase(), {
      ...entry,
      term: entry.term.toLowerCase(),
    });
  });

  return [...entryMap.values()];
}

function createLexiconSeedBundle(config) {
  const {
    functionWords = [],
    highFrequencyWords = [],
    familiarWords = [],
    generalWords = [],
    uncommonWords = [],
    academicWords = [],
    technicalWords = [],
  } = config;

  return {
    functionWords: [...functionWords],
    highFrequencyWords: [...highFrequencyWords],
    lexicon: dedupeEntries([
      ...createEntries(uncommonWords, {
        role: 'content',
        familiarityScore: 0.46,
        rarityScore: 0.54,
        complexityAdjustment: 0.04,
        commonalityBand: 'uncommon',
        technical: false,
      }),
      ...createEntries(generalWords, {
        role: 'content',
        familiarityScore: 0.72,
        rarityScore: 0.28,
        complexityAdjustment: -0.02,
        commonalityBand: 'general',
        technical: false,
      }),
      ...createEntries(familiarWords, {
        role: 'content',
        familiarityScore: 0.86,
        rarityScore: 0.14,
        complexityAdjustment: -0.08,
        commonalityBand: 'common',
        technical: false,
      }),
      ...createEntries(academicWords, {
        role: 'content',
        familiarityScore: 0.38,
        rarityScore: 0.62,
        complexityAdjustment: 0.08,
        commonalityBand: 'academic',
        technical: false,
      }),
      ...createEntries(technicalWords, {
        role: 'technical',
        familiarityScore: 0.18,
        rarityScore: 0.86,
        complexityAdjustment: 0.18,
        commonalityBand: 'specialized',
        technical: true,
      }),
      ...createEntries(highFrequencyWords, {
        role: 'highFrequency',
        familiarityScore: 0.94,
        rarityScore: 0.06,
        complexityAdjustment: -0.12,
        commonalityBand: 'highFrequency',
        technical: false,
      }),
      ...createEntries(functionWords, {
        role: 'function',
        familiarityScore: 0.99,
        rarityScore: 0.01,
        complexityAdjustment: -0.16,
        commonalityBand: 'function',
        technical: false,
      }),
    ]),
  };
}

export const englishLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      the a an and or but if in on at to for
      of with by as is it this that these those be been
      being was were are am
    `),
  highFrequencyWords: words(`
      you have not from your all his they one can will just
      like about out what has when more who had their there her
      which time get would she new people how some also them now
      other its our than good only after first him into know see
      two make over think any then could back want because well said
      way most much very where even should may here need really did
      right work year years day too going before off why made still
      take got many never life say world down great through last while
      best such love man home long look something use same used both
      every come part state three around between always better find help high
    `),
  familiarWords: words(`
      little old since another does own things under during game thing give
      house place school again next each without against end found must show
      big feel sure team ever family keep might please put money free
      second someone away left number city days lot name night play until
      company doing few let real called different having set thought done however
      getting god government group looking public top women business care start system
      times week already anything case nothing person today change enough everything full
      live making point read told yet bad four hard mean once support
      tell including music power seen states stop water based believe call head
      men national small took white came far job side though try went
      yes actually american later less line order party run says service country
      open season thank children everyone general trying united using area black following
      law makes together war whole car face five kind maybe per president
      story working course games health hope important least means news within able
      book early friends information local post thanks video young ago others social
    `),
  generalWords: words(`
      talk court fact given guys half hand level mind often single become
      body coming control death food guy hours office pay problem south true
      almost history known large lost research room several started taking university win
      wrong along anyone else girl john matter pretty remember air bit friend
      hit needs nice playing probably saying understand yeah york class close comes
      idea international looks past possible wanted cause due happy human members months
      move question series wait woman ask community data late leave north saw
      special watch either future light low million morning police short stay taken
      age buy deal rather reason red report soon third turn whether among
      check development form further heart minutes myself services yourself act although asked
      child fire fun living major media phone players art behind building easy
      gonna market near non plan political quite six talking west works according
      available education final former front kids list ready sometimes son street bring
      college current example experience heard london meet program type baby chance father
      march process song study word across action clear gave gets himself month
      outside self students words board cost cut field held instead main moment
      mother road seems thinking town wants department energy fight fine force hear
      issue played points price rest results running shows space summer term wife
      america beautiful date goes
    `),
  uncommonWords: words(`
      killed land miss project sex shot site strong account especially eyes include
      june parents period position record similar total above club common died film
      happened knew lead likely military perfect personal security share won april center
      county couple dead english happen hold industry inside issues online player private
      problems return rights sense star test view weeks break british companies event
      higher hour member middle needed present result sorry takes training wish answer
      boy design finally girls gold gone guess interest july king learn policy
      society added alone average bank brought certain church east hands hot longer
      medical movie original park performance press received role sent themselves tried worked
      worth areas became bill books cool director exactly giving ground meeting provide
      questions relationship september sound source usually value evidence follow lives official production
      rate reading round save stand stuff tax whatever amount blue countries david
      drive eat fall fast federal feeling felt green league management match model
      picture size step trust central changes england forward groups hey key mom
      page paid range review science trade upon various attention brother cannot character
      chief cup football hate james led looked lower natural october property quality
      send style vote amazing august blood china complete dog economic hell involved
      itself language lord november oil related serious stage terms title add article
      attack born damn decided
    `),
  academicWords: words(`
      analysis structure context process distribution interpretation evidence concept complexity morphology cognitive theory
      method research argument perspective category principle function variable assumption conclusion
    `),
  technicalWords: words(`
      electroencephalographic synchronization interdisciplinary neurophysiology counterrevolutionary incomprehensibility algorithm phonology semantics cryptographic biochemical spectroscopy
      telecommunications thermodynamics calibration transformation syntax metadata
    `),
});

export const frenchLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      le la les un une des et ou mais de du à
      au aux en dans pour sur est ce je tu il elle
      on nous vous ils elles qui que qu ne pas se
    `),
  highFrequencyWords: words(`
      par plus avec son sont tout fait comme être bien cette faire
      même ont était été mon ses lui aussi peut deux leur moi
      ces quand après suis très tous sans avoir non encore alors avait
      entre temps ans autres dit peu autre france rien dire monde fois
      faut toujours voir bon contre votre avant depuis donc notre sous jamais
      vie moins dont toi déjà quoi soit trop leurs ton toute chez
      gens juste oui vraiment ainsi grand pays français mes beaucoup jour quelques
      comment premier sera nos parce personne cela trois homme ici paris toutes
      cas chose doit partie car mal première bonne fin mieux pendant petit
      puis année cet ceux moment place plusieurs pourquoi ville jours mois vers
    `),
  familiarWords: words(`
      histoire mort sais années fais nouveau nouvelle part travail compte merci prendre
      veut état aller cours peux politique reste veux vos celui chaque grande
      personnes femme nom prix également point seul vais eux lieu lors vrai
      droit selon coup mettre serait pense quelque tant avais groupe maintenant maison
      saint tête étaient aime aurait avons enfants famille parler suite assez besoin
      demande genre savoir société trouve celle côté passe pouvoir question raison sens
      ailleurs avez certains devant dis jeu soir souvent effet général jean partir
      surtout équipe choses dernier enfin font nombre parle porte seulement site eau
      ensemble hommes petite femmes mère passer près quel tes vois aucun loi
      parti pris père rapport dès peuvent trouver autant face fille fut gouvernement
      gros guerre niveau passé pourrait quatre semaine service seule accord article donne
      donner ligne problème président vient cause crois dieu début exemple fils jeune
      mis système air aucune bas centre façon heure heures loin possible projet
      conseil dernière idée notamment nuit vont étais argent tour vue êtes aura
      dessus film meilleur corps ensuite forme haut plutôt arrive avaient chef europe
    `),
  generalWords: words(`
      fort public tard ayant main terre titre matin mise plan saison sait
      type afin aide belle choix française long minutes retour situation sommes vite
      yeux amour base journée nord devrait donné etc grâce moyen ordre prend
      école étant but cinq manière mars pierre québec semble sujet truc agit
      enfant ministre nouvelles parfois quelle rue sud super sûr unis vidéo amis
      art beau compris gauche livre musique région entreprise jeunes longtemps match permet
      simple voilà voit chambre deuxième importe juin lorsque mai peur plein police
      septembre sécurité série ancien anglais certaines grands important jouer membres parmi peine
      presque services tellement époque allez doute force lire marché mot points recherche
      santé seront train voix écrit affaires autour avis cependant développement faites hier
      juillet millions nationale nombreux parents propre rendre vivre droite environ fond mec
      mesure ouais pourtant trouvé abord affaire envie gars laquelle nouveaux octobre pouvez
      siècle sortir terme viens voiture ait avril droits françois frère janvier jeux
      population questions roi venir action club culture cœur difficile existe laisse malgré
      milieu produit programme propos route états derrière direction doivent emploi feu marche
      mots mêmes période tel âge armée bois chance confiance croire date dix
      décembre laisser manque mode novembre petits plaisir produits rencontre résultats six vas
      août aurais blanc canada classe commence comprendre demain demander formation liste photo
      rôle attention bout conditions
    `),
  uncommonWords: words(`
      esprit espère garde internet intérieur intérêt mouvement noir origine présente regarde rouge
      sortie auteur bonjour février justice langue meilleure met occasion offre perdu politiques
      qualité risque scène sinon travaux voici appelle cadre changer entreprises grandes libre
      premiers production semaines vieux connais facile image lien mer photos pire rester
      sauf source troisième aider ami campagne coupe cour durant faisait objet partout
      plupart problèmes seconde valeur étude études chacun cher devient données etat hein
      hors joue lequel montre national particulier penser poste présent publique réponse réseau
      salle texte veulent appel celles certain contrôle dois message position république succès
      économique activité américain association carte chercher connu création devenir euros expérience filles
      fonction impression louis nature putain simplement travers allemagne annonce arrêter bientôt chemin
      demi différents directeur espace liberté mariage new organisation passage présence sein sort
      zone économie bureau compagnie entrée mains moyenne pied presse prise réalité social
      sorte université utiliser œuvre accès commission différentes dimanche départ générale lit marie
      mauvais numéro puisque regarder soient soleil taux travailler voie acheter afrique attendre
      bras charge finalement fini haute manger marque moyens perdre pièces pratique sociale
      victoire vérité ben cherche communauté domaine idées monsieur nombreuses payer peuple proche
      publié quant reçu répondre suivre administration auprès code demandé entendu faisant gagner
      honneur journal matière ouest permis rapidement retrouver résultat sept soirée sol sport
      téléphone version armes arriver
    `),
  academicWords: words(`
      analyse structure contexte processus distribution interprétation preuve concept complexité morphologie cognitive théorie
      méthode recherche argument perspective catégorie principe fonction variable hypothèse conclusion
    `),
  technicalWords: words(`
      électroencéphalographique synchronisation interdisciplinaire neurophysiologie contrerévolutionnaire incompréhensibilité algorithme phonologie sémantique cryptographique biochimique spectroscopie
      télécommunications thermodynamique calibration transformation syntaxe métadonnées
    `),
});

export const germanLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      der die das ein eine und oder aber mit von zu im
      in auf für ist es sie er wir ich du dem den
      des als an bei aus um
    `),
  highFrequencyWords: words(`
      nicht sich auch dass wie hat sind nach noch war nur wenn
      wird was werden einen man haben einer zum kann über dann einem
      schon habe mehr mir sein vor mal zur durch hier mich bis
      doch ihr immer jetzt diese wurde wieder keine alle sehr können muss
      uns bin unter vom gut gibt hatte ihre dieser gegen seine alles
      also geht viel zeit ganz machen denn meine damit dir will einfach
      ohne weil beim etwas waren zwei mein eines kein seit soll selbst
      dich menschen hab heute kommt nichts nun würde leben wer macht anderen
      deutschland ihm jahr ihn jahren seiner viele zwischen jahre wäre diesem dieses
      wurden dabei dort müssen gerade neue sondern erst ersten ihrer lassen sollte
    `),
  familiarWords: words(`
      andere hast warum weiss weiter wirklich ihnen ihren mann wohl drei seinen
      vielleicht dazu diesen euch kommen wollen bitte hätte sei könnte sehen sowie
      tag berlin dafür ins sagen steht während bereits deutschen ende nie uhr
      weg wegen besser einmal frau stadt welt gehen gemacht genau danke gar
      konnte leute neuen seinem unsere dies etwa jeder natürlich bist gute recht
      finden geben kinder werde geld gleich keinen lange sagt teil allem beiden
      davon eigentlich fast richtig tun arbeit denen deutsche erste frage meiner sieht
      zurück deine jedoch klar paar grosse grossen liegt welche wissen zusammen einige
      fall gab kannst sicher frauen ihrem kam allen darauf hatten letzten meinen
      nein schön sogar vielen worden zwar allerdings art schnell sollen darf jeden
      jemand später stehen wollte ganze gerne möchte seite spiel weitere wenig heisst
      liebe oft sagte fragen land neben statt dein gehört lässt platz besonders
      geschichte nehmen darüber deren hin vier gesagt guten kurz meinem morgen sonst
      unser bekommen euro gesehen kleine spielen weniger familie ging haus sollten arbeiten
      bild bleibt eigenen möglich weit deshalb eben gewesen glaube minuten polizei ausserdem
    `),
  generalWords: words(`
      beide findet ganzen leider musste online stellen tage unternehmen woche würden besten
      bleiben daher grund kaum namen problem daran halt nacht neu stand stunden
      thema beispiel genug allein dessen direkt echt halten kleinen schule solche zeigt
      überhaupt anders essen lang abend dank ebenfalls eher hinter mag musik münchen
      pro wasser alten bald erhalten junge lieber nachdem ort sofort zweiten aller
      auto bringen danach deutlich finde hand jede kopf männer nächsten unserer damals
      endlich fünf gefunden gilt person schwer wichtig zeigen egal gesellschaft hoch letzte
      stark alter anfang gegenüber kind oben rund spd strasse bekannt bisher eltern
      europa gott hätten los mutter wochen augen beste braucht denke gruppe her
      meisten millionen schreiben treffen trotzdem artikel bestimmt deutsch folge glück herr hilfe
      leicht mehrere niemand politik sache scheint zunächst alte bayern bisschen denken fand
      film internet laut lesen personen regierung richtung schliesslich stellt team buch dinge
      dürfen früher geworden prozent sohn spass stelle wort bereich besteht bringt ernst
      gross mensch mädchen vater zukunft all darum eigene fahren fest form frei
      idee jedes keiner liegen neues passiert österreich bevor gegeben hamburg jedem manchmal
      raus super tut wahl wert wien einzige entwicklung folgen freunde führt helfen
      kosten könnten obwohl sehe suchen weiteren ziel ziemlich angst dadurch erfolg hause
      krieg lage läuft mai probleme september verstehen voll wann wieso afd alt
      aufgrund brauchen innerhalb insgesamt
    `),
  uncommonWords: words(`
      klasse konnten nimmt preis rein rolle stimmt tagen tod völlig zudem ach
      ausser cdu gekommen gern gestern irgendwie kirche meist märz seines trotz vergessen
      verschiedenen vorbei zahlen anderes blick dagegen deinen ebenso führen kaufen lernen meinung
      name partei reden seiten willst wobei zweite hält jungen moment schlecht sechs
      spiele spielt sprechen video august bilder dachte glauben mitte november sowohl wahrscheinlich
      april deiner einigen frankfurt freund insbesondere per peter raum spricht system tatsächlich
      anderem bekommt erreicht gemeinsam juli juni links mach new nämlich oktober schaffen
      setzen suche versucht bedeutet einsatz falls gleichzeitig grosser habt hören ihres köln
      möglichkeit rahmen rechts sachen schweiz stück welches fällt genommen hoffe höhe job
      liess michael nächste sex sommer stunde titel tochter unseren wohnung wären zahl
      zehn handelt kennen kunst mitarbeiter sah sorgen sprache verloren weise zumindest übrigens
      bad band chance fehler gebracht hallo hinaus langsam menge meter mindestens musst
      selber sicherheit spieler drauf erklärt erster gefühl gleichen laufen medien saison verschiedene
      weiterhin ziehen überall antwort bahn berliner dennoch dezember gesicht guter machte monate
      seien somit thomas toll tragen vergleich versuchen entscheidung gedanken gehören gemeinde gutes
      herz jahres januar jeweils nutzen nähe siehe sinn stuttgart sucht vorher welcher
      bereit daten deinem falsch fertig foto häufig interesse kultur könig luft lösung
      nen reihe schöne stimme boden bruder erreichen februar frankreich fussball heraus informationen
      kennt kritik manche neuer
    `),
  academicWords: words(`
      analyse struktur kontext prozess verteilung interpretation beleg konzept komplexität morphologie kognitiv theorie
      methode forschung argument perspektive kategorie prinzip funktion variable annahme schlussfolgerung
    `),
  technicalWords: words(`
      elektroenzephalographisch synchronisation interdisziplinär neurophysiologie konterrevolutionär unverständlichkeit algorithmus phonologie semantik kryptographisch biochemisch spektroskopie
      telekommunikation thermodynamik kalibrierung transformation syntax metadaten
    `),
});

export const spanishLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      el la los las un una unos unas y o pero de
      del en con por para es que se lo al yo tú
      él ella nosotros vosotros ellos ellas quien quienes sin
    `),
  highFrequencyWords: words(`
      como más este sus esta todo cuando ser son hay está fue
      muy sobre también todos eso tiene nos porque qué así años dos
      bien entre puede desde hasta hacer ahora era esto vez hace nada
      donde parte solo algo tiempo día uno mejor mucho tan ver vida
      ese han mismo siempre tengo cada después están gente esa estado estoy
      mundo año les mas otro otros gracias otra cosas gran menos nunca
      personas tanto antes poco sea había tener trabajo durante lugar creo cómo
      hecho quiero sólo aunque contra cuenta decir gobierno país soy todas casa
      estos forma nuevo sido aquí estas estaba estar hoy tienen alguien dice
      toda tres voy caso días momento bueno ciudad mis nuestro luego nacional
    `),
  familiarWords: words(`
      parece nuestra poder pueden pues verdad historia mientras nadie nueva otras primera
      veces muchos cual debe dijo entonces tipo algunos general mayor tal además
      mal muchas primer según acuerdo cualquier dios fueron manera nombre ley medio
      partido bajo fuera hacia sino grupo haber hombre puedo buena mujer persona
      será sistema casi fin hizo noche pasado presidente quiere tenemos tus eres
      méxico ahí cosa dentro españa estamos familia lado aún buen podemos misma
      pueblo tenía esos final mujeres política problema punto agua alguna equipo guerra
      saber vamos van ante dar embargo favor gusta importante información mañana pasa
      semana tienes claro dinero san social ejemplo estados horas igual millones número
      algunas hablar hora madre señor siendo centro derecho falta grandes haciendo hombres
      nuestros puedes amigos buenos cambio idea mierda muerte problemas tarde tras través
      meses podría realidad algún amor dicho eran frente incluso primero real vas
      cuatro desarrollo hijo sociedad tema varios esas nivel niños seguro sería argentina
      hacen hemos juego llegar mano paso posible proyecto sigue somos unidos uso
      artículo cerca cierto grande países quién razón sabe todavía amigo madrid mayoría
    `),
  generalWords: words(`
      padre salir seguridad tierra visto único cuerpo programa segundo universidad último cabeza
      foto haya internacional mil palabras pasar público seguir servicio situación ayuda juan
      libro siguiente veo datos dejar educación proceso sentido cinco clase cuanto derechos
      ello estás hijos mes usted largo ningún orden puesto quieres realmente alto
      demás dicen diferentes español junto lista medios ninguna personal total trata video
      viene web base camino digo empresa especial hola paz policía queda salud
      sitio tomar tuvo zona calle cara línea mundial obra ojos pensar servicios
      sociales allí atención debería escuela julio pueda quieren respecto segunda siento vivir
      capital casos etc libre luz mejores población relación sabes suerte varias bastante
      cultura debido difícil dio estaban fotos fuerte fácil habla miedo minutos música
      poner pregunta rey vos apoyo dado deja demasiado espero fuerza iba josé
      manos mayo mucha oficial propio buenas chile control deben empresas encontrar inglés
      marzo peor serie sur trabajar última asi edad futuro justicia libertad nuestras
      pesar tampoco venezuela allá cantidad corazón diciembre encuentra existe imagen importa norte
      octubre político principal propia vista volver voz actual ambos elecciones estudio grupos
      media mira modo palabra pasó sean tenido abril campo hubiera internet joven
      nuevos plan puntos pública región significa comunidad dirección habían has investigación junio
      lleva nuevas partidos partir película república resto vuelta consejo dan dónde hacerlo
      llamado mercado movimiento noviembre
    `),
  uncommonWords: words(`
      papel precio respuesta seis simplemente única agosto aun cargo comida cuales enero
      experiencia jefe leer llama llevar miembros padres pena producción siglo ustedes cabo
      común economía entiendo espacio febrero hablando haga necesita opinión oportunidad organización partes
      página resultados santa tenga vale acción arte condiciones conocer estuvo necesito noticias
      plaza septiembre usar valor vivo calidad causa central director duda europa fecha
      feliz iglesia necesario obras políticos pronto resultado alta cambiar civil colombia hermano
      libros local mar mismos viaje últimos acerca acá alrededor campaña carrera ejército
      encima estudios interés llegó mensaje negro niño objetivo popular principio provincia recursos
      red río aquellos ayer blanco carlos comer compañía diciendo especialmente ganar interior
      lucha mediante nota pequeño prueba saben sol vaya anterior buscar dia fuerzas
      justo lugares medida podía primeros principales temas ven éxito actividades adelante aire
      américa arriba autor baja diferencia dije entrar estilo juegos lejos luis mala
      maría militar muestra oro par plata puerta relaciones sola ayudar canción color
      contigo defensa dólares fondo fútbol hago hija humanos ideas importantes llega menor
      ministerio pocos puerto quería recuerdo semanas acceso armas busca comunicación congreso espera
      evitar finalmente fuente hubo jugar juntos ministro productos puta siquiera época acciones
      actividad banco conocido conseguir construcción corte cualquiera departamento diez existen formas mitad
      oficina presente queremos sector serio superior supuesto boca capacidad comprar crear diferente
      energía esperar haces hicieron
    `),
  academicWords: words(`
      análisis estructura contexto proceso distribución interpretación evidencia concepto complejidad morfología cognitivo teoría
      método investigación argumento perspectiva categoría principio función variable hipótesis conclusión
    `),
  technicalWords: words(`
      electroencefalográfico sincronización interdisciplinario neurofisiología contrarrevolucionario incomprensibilidad algoritmo fonología semántica criptográfico bioquímico espectroscopia
      telecomunicaciones termodinámica calibración transformación sintaxis metadatos
    `),
});

export const italianLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      il lo la i gli le un una e o ma di
      del in con per che è si da io tu lui lei
      noi voi nel nella alla della
    `),
  highFrequencyWords: words(`
      non sono come più dei anche delle questo dal solo essere cui
      era stato quando tutti questa tutto cosa hanno tra fatto prima suo
      loro parte perché anni due sia sua fare così dalla degli dopo
      sul alle uno poi quello sempre chi ancora molto senza mai ogni
      altri ora mio può quanto mia sulla tempo dove vita nei già
      sei quella quindi secondo hai proprio altro bene grazie lavoro modo dai
      nelle casa persone qui sta volta dire italia giorno mondo questi stata
      siamo stesso via cose grande primo contro caso mentre tutte abbiamo quel
      oggi tanto città nuovo detto fine qualche quale suoi viene aveva anno
      dalle sarà stati storia tre tuo avere fino foto altre dello erano
    `),
  familiarWords: words(`
      meglio queste visto ciò meno però sarebbe sotto momento aver vedere deve
      forse giorni invece nostro agli qualcosa sembra fosse oltre perchè troppo vero
      allora durante gente legge niente posto alcuni fuori nome poco roma sto
      andare insieme punto qualcuno quelli tipo tutta altra davvero dice nessuno nuova
      quali tua verso volte comunque far negli possono video sui voglio male
      nostra numero quasi quelle cazzo certo gruppo persona stessa sue sulle dato
      società uomo famiglia nulla ore paese problema puoi circa credo governo molti
      posso potrebbe col ecco esempio ben donne fanno italiano milano possibile rispetto
      sistema vuole abbia adesso bisogno serie allo almeno donna miei nazionale generale
      guerra infatti morte sito avuto base film politica pure spesso uomini comune
      subito centro dio fra inoltre parlare scuola vuoi appena buona idea mano
      siano alcune amici avrebbe causa corso forza importante mesi presidente seguito senso
      successo basta diritto fai nostri parole scritto soprattutto stanno terra padre penso
      piace dare devo piano porta settimana state trovare vengono vista genere letto
      migliore pubblico realtà strada livello lungo mezzo problemi ragazzi seconda tale bella
    `),
  generalWords: words(`
      diversi grandi particolare pubblicato ragione settembre dovrebbe marzo notte possa presso quattro
      san situazione attività attraverso bambini consiglio faccio forma italiana libro qualsiasi sapere
      saranno soldi buon campo dagli faccia figlio prendere progetto propria servizio testa
      accordo amore avevo capo conto giusto madre periodo preso studio tratta unico
      ciao dati diverse gioco grado voce forte giro gran italiani maggio mese
      nello ricerca unica uso capire corpo facendo fatti luogo nemmeno ormai parla
      partito passato quei ragazza avanti avete euro favore figli milioni minuti molte
      sicurezza tuttavia acqua aprile casi cuore difficile domanda giugno occhi presente siete
      trova vedo articolo bello capito chiesa cioè devi informazioni maggior media ottobre
      parola pochi prova sera stai sud titolo vorrei cinque europa fatta luglio
      musica nuove nuovi paesi paura pensare primi regione sociale sopra stare dietro
      inglese maggiore messo nord post questione termine vicino vivere abbastanza data dell
      dico ero giornata lingua mettere piccolo posizione possibilità potere programma usa zona
      controllo cultura devono dovuto febbraio futuro ieri mercato neanche polizia veramente alto
      amico avevano cura davanti dicembre magari nonostante novembre pare personale piuttosto possiamo
      punti scelta semplice sviluppo tanti trovato tuoi ultimi agosto condizioni dentro fronte
      leggi luce mare motivo opera piu poter probabilmente rapporto resto sai sicuro
      vari attenzione farlo gennaio giovani napoli nessun online parti risposta ruolo sola
      stessi vedi guarda linea
    `),
  uncommonWords: words(`
      mente tempi uniti classe continua esperienza mie pubblica ragazze squadra ultimo voglia
      arte auto giovane lavori merda oppure piazza processo qualità ragazzo risultati significa
      specie aiuto bisogna capisco colpa domani effetti facile genitori internazionale libri mani
      produzione repubblica sinistra spero ufficiale ultima dobbiamo fondo leggere libertà massimo metà
      passo popolo presto ricordo sede serve spazio studi territorio valore varie vera
      verità viaggio bel cerca diritti francia mamma migliori moglie new nostre pace
      papa politico presenza servizi stiamo vogliono breve civile lavorare ministro nessuna ordine
      oro pensa piedi rete speciale torino tramite all calcio centrale codice felice
      pagina piccola provincia riguarda sentire sole vado vanno vede web cosi internet
      macchina movimento notizie perdere riguardo sento stile cittadini domande età inizio nota
      occasione opere passare perso prezzo prodotto qua scusa secolo stagione università vai
      cambiare camera corte deciso destra ecc formazione locale maria mondiale necessario popolazione
      portato reale sesso soltanto tante terzo testo totale versione alta bambino chiaro
      chiesto dieci diventare finalmente fratello fuoco interesse maniera natura ovviamente partire piacere
      portare potuto quanti risultato semplicemente vostro arriva arrivare aspetto carta cercare completamente
      comunità danno dicono esiste festa forze francese importanti libero presenti principale pur
      relazione scrivere stampa tornare usare avrei comuni entrambi francesco furono messaggio mostra
      prime prossimo scopo simile beh cibo direttamente facciamo figlia finale lato lunga
      prodotti propri sangue tema
    `),
  academicWords: words(`
      analisi struttura contesto processo distribuzione interpretazione evidenza concetto complessità morfologia cognitivo teoria
      metodo ricerca argomento prospettiva categoria principio funzione variabile ipotesi conclusione
    `),
  technicalWords: words(`
      elettroencefalografico sincronizzazione interdisciplinare neurofisiologia controrivoluzionario incomprensibilità algoritmo fonologia semantica crittografico biochimico spettroscopia
      telecomunicazioni termodinamica calibrazione trasformazione sintassi metadati
    `),
});

export const dutchLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      de het een en of maar van in op met voor aan
      is dat die dit te als bij om ik jij hij zij
      wij we je er uit naar
    `),
  highFrequencyWords: words(`
      niet zijn ook door dan was wat heeft over nog deze hebben
      kan meer geen mijn wel tot wordt heb worden haar ben kunnen
      veel jaar moet hoe mensen ons waar werd goed gaan gaat onze
      wil zich zou doen andere hier dus tegen maken alleen mij onder
      had hun twee nieuwe weer zien zal moeten eerste komt echt eens
      daar heel toch dag mee staat alle tijd zoals iets komen leven
      omdat toen waren hem jullie tijdens altijd tussen weet wie laten waarom
      alles net via even gewoon grote man terug laat zonder uur steeds
      zie bent eigen keer maakt willen iedereen weg hele iemand binnen werden
      werk nooit zit één drie zelf aantal geven hebt kinderen samen vinden
    `),
  familiarWords: words(`
      kunt plaats snel toe deel elkaar huis laatste mag nederland nodig vanaf
      vind vrouw weten doet krijgen want allemaal beter erg staan zeggen zegt
      denk gemaakt land naam zeker zullen misschien stad verschillende volgens anders goede
      houden volgende blijven graag jou kwam verder wanneer beste lang niets per
      vandaag vragen werken dagen eerst elke vraag zelfs gebruikt gezien ging nee
      wereld helemaal jaren kom lijkt paar doe foto geld kijk vooral leuk
      nemen vaak achter gedaan groot natuurlijk sinds bijna geeft kijken mooi ten
      week dood hadden familie kon nieuws rond website wilt zitten jouw kleine
      online moment tweede vrouwen ligt manier politie welke buiten enkele geleden geweest
      kun water zei eten klaar mannen nieuw oude september ter denken echter
      enige gebruik helpen hoop men minder nou open beetje bekend dingen genoeg
      groep later maart mogelijk ziet auto school soms thuis den film gebruiken
      krijgt mooie niks spelen zoek blijft hen onderzoek terwijl vier zeg zorgen
      eigenlijk informatie pas waarin amsterdam april nederlandse probleem vanuit video vindt zouden
      maak ooit soort vader vast vrienden zeer zuid artikel begin gebied moest
    `),
  generalWords: words(`
      vrij werkt zodat amerikaanse best daarom idee leren moeder ongeveer regio vijf
      boven niemand oktober verhaal brengen eerder kans meest grootste hand horen november
      opnieuw ander bestaat echte kreeg meisje muziek naast slechts waarbij zetten zoon
      daarna duidelijk hoofd kind minuten vond wachten zorg zowel boek dank gehad
      gemeente gratis hoor hou lekker maanden problemen team vroeg weinig belangrijk blij
      druk gelijk houdt lopen mogen oud precies vol afgelopen beginnen betekent december
      dezelfde geval miljoen sommige zoeken zoveel halen lange lezen mei moeilijk nummer
      ouders partij top weken zaken bezig januari langs morgen hulp klein krijg
      nadat vele bedankt bijvoorbeeld delen gevonden maand noord oorlog praten recht wilde
      zag zet begon einde kamer maakte meeste plaatsen prijs programma stond gaf
      liggen meisjes neem orde volgen deed geef geplaatst juist kant landen reden
      vanwege waardoor zaak elk euro europa gevoel geworden jonge media valt voordat
      aandacht anderen beide dacht geschiedenis hetzelfde juli lees midden new ogen proberen
      slecht stuk vervolgens waarschijnlijk bedrijf februari gegeven gelukkig handen juni leden lichaam
      onderwijs plek stellen wedstrijd wist zes dochter ervan meteen persoon rol uiteindelijk
      vorm woord word augustus buurt contact gepubliceerd hoge kopen leeftijd lid liefde
      minister neemt toekomst verenigde zat avond betalen denkt doel hart heen ieder
      organisatie provincie tien vergeten actie belangrijke huidige nationale rest bang begint centrum
      direct gezegd god internet
    `),
  uncommonWords: words(`
      inwoners jan jarige kwamen leuke loopt plan president zichzelf alsof basis derde
      enkel geloof genoemd mens overal politiek project staten vertellen waarvan woorden zin
      bestaan ervoor europese extra grond hoeveel konden kort leiden seizoen vallen algemeen
      antwoord bericht daarmee doden eind geweldig hard korte links meter nam omgeving
      onderdeel speelt succes vanavond ver welkom wet boeken gebeurt gehouden hoewel iedere
      kleur langer site stap telefoon vorige waarmee waarop wonen bed beeld bezoek
      dienst gek inderdaad jezelf jongens leger lijst los personen rijden stem verloren
      zwarte belangrijkste blijf club erop frankrijk geboren genomen helaas kent mis ontwikkeling
      rode spel sterk totaal veilig vriend waaronder bedrijven begonnen diverse inmiddels internationale
      licht sociale veranderen voorbij voorkomen vormen aanwezig duitsland eiland geschreven hoeft jongen
      ken link meestal pijn prima punt stoppen verwacht volgt actief fijn gekomen
      gekregen koning kop liet meerdere nacht normaal politieke prachtig regering straat trots
      voel vraagt vrije zaterdag belang bovendien broer eindelijk ergens kennen live namen
      nederlands noemen partijen periode richting schreef titel universiteit volledig zee belgië bepaalde
      brengt dorp for gisteren kiezen officiële schrijven afrika blijkt daarnaast heerlijk hoogte
      john mocht ondanks overleden raad reis serie slapen start stel stemmen sturen
      tegenwoordig utrecht versie vertrouwen vriendin wakker ziekenhuis acht baan centraal dicht dieren
      gebracht gegaan gewonnen half overheid relatie ruim rust slechte tekst vrijdag witte
      york bank energie gebouw
    `),
  academicWords: words(`
      analyse structuur context proces verdeling interpretatie bewijs concept complexiteit morfologie cognitief theorie
      methode onderzoek argument perspectief categorie principe functie variabele aanname conclusie
    `),
  technicalWords: words(`
      elektroencefalografisch synchronisatie interdisciplinair neurofysiologie contrarevolutionair onbegrijpelijkheid algoritme fonologie semantiek cryptografisch biochemisch spectroscopie
      telecommunicatie thermodynamica kalibratie transformatie syntaxis metadata
    `),
});

export const norwegianLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      og eller men at det den de en et i på med
      for av er som til om seg vi jeg du han hun
      ikke fra over under ved inn
    `),
  highFrequencyWords: words(`
      har var kan dette noe skal noen ble vil bare også hva
      etter meg være blir hadde alle når her deg man mer opp
      andre gjør litt vært bli får denne enn gjøre mye der hvor
      norge igjen kommer mot selv hvis før fikk alt flere helt ser
      min oss går vel hvordan uten ingen mange dere kunne siden sin
      tror folk nok sier dag norsk første god godt hele kanskje dem
      din gang skulle slik bra norske kom samme sammen vet annet bedre
      disse aldri tar blitt oslo mellom ville sett tid veldig nye hvorfor
      rundt rett trenger fordi gikk hans nei ned store ting tre mener
      sine del siste bør gir gjennom mest alltid tilbake like blant både
    `),
  familiarWords: words(`
      finnes stor fått tatt vår barn finne gjort hos komme sitt burde
      hver akkurat beste mens deres står takk ønsker lenge bruke feil gode
      mitt mulig tidligere liker tok viktig heller hvem skjer bruker fortsatt først
      menn verden faktisk frem mine måtte virkelig ute egentlig grunn kvinner mann
      mindre ofte annen derfor eneste ganger hatt livet sånn tiden politiet egen
      finner kjent neste nesten ditt gjerne kun penger plass større viser ham
      holde jobb kjøpe langt ligger greit laget land våre allerede betyr bruk
      liten mennesker satt synes vanskelig ett prøver sikkert vei altså ganske gjorde
      videre brukt dine lite norges tro usa årene begge dager fint gjelder
      landet nytt stort svært uansett dårlig enda gamle hjelp hjem hvert håper
      kjenner død faen fleste klarer liv måte saken snakker sted tillegg dagen
      legge slutt bak bort eksempel fire føler kveld snakke ingenting jenter klart
      per senere stedet all dersom høyre personer riktig skjønner brukes deler følge
      gitt hennes lett sette spesielt spørsmål største begynner gått holder høre navn
      prøve samtidig bergen fem hjelpe jobber klar mål tenke tenker fort mat
    `),
  generalWords: words(`
      side snart venner forhold funnet henne lage lang lenger lese ord særlig
      utenfor året best lag millioner møte nettopp spiller veien virker byen dermed
      elsker forskjellige glad høy lov sitter enig fram hjemme timer utrolig vårt
      døde hverandre kort leder samt tallet vanlig vant vise vite ellers innen
      likevel løpet sagt sverige kommet morgen skole fant legger skolen støtte tidlig
      unge valg dagens egne enkelt full kommune slike bilder fall fotball hei
      nrk person setter skriver stå form helst høyere jobbe minst nord selvfølgelig
      begynte europa ferdig frp hvilken lagt lei lære minutter par politikk vær
      familien flott følger gammel regjeringen skrevet små trodde ulike unna bil dra
      handler klare kroner spill stille via alene arbeid eget enkelte hjelper inne
      problemer skrive åpne antall foran grad husker hører jobben lever navnet resten
      spille tur uke verdens basert fast holdt høyt kjøre området rekke svar
      forstår født hodet poeng skjedde spør vann arbeidet bilde direkte fin kjører
      lyst sak slags stemmer tenk begynne bilen kvinne leve spise startet barna
      dessverre høres hørt jente masse seks steder syns trondheim bor driver fantastisk
      forstå imot musikk pris venstre ønske ekstra heter informasjon innenfor kjente kultur
      mai sant selvsagt sende tross økt deretter gratis gutter natt politisk problem
      rart råd skje spennende stadig uker viktigste betale mulighet pengene sist tusen
      velge ansvar bildet drept
    `),
  uncommonWords: words(`
      familie galt historie kontroll krav skikkelig sør absolutt brukte eldre film kontakt
      måten sex sikker kaller les måneder møter pga prosent søker sønn ansatte
      borte bygge endelig far hvilke ifølge kamp lar lille opptatt plutselig sendt
      skjedd slå spillere stavanger time valgt bryr fortsette fri gud hyggelig interessant
      kampen lengre løp mamma mannen politiske reise sentrum sesongen slikt sosiale verre
      ene hardt hus john lurer meget passer rette rom sitte sjekke skrev
      verdt forskning fremdeles gangen jobbet kjære krever offentlige problemet redd sterkt stortinget
      utdanning velkommen venter engelsk enten helse imidlertid lager lykke mente nær slett
      snakk tenkt totalt våpen åpnet ønsket danmark gjøres klarte live lærer offentlig
      perfekt slipper sto vekk forrige forslag legg lokale medlemmer områder omtrent velger
      visst årets drikke dyr engang foreldre forteller nivå nordmenn prisen regjering selge
      selskapet slutte tredje type umulig vente vis viste voksne bakgrunn besøk dessuten
      forbindelse fortelle fungerer fører gøy historien husk hvite kjøper midt osv russland
      sider skape slutten staten tak tide aller april dele drar ekte fly
      fortsetter gruppe huset kjøpt lettere mars morsomt sender september spilte alvorlig behov
      endret ettersom forsøk kalt kamper krig kroppen meter nett nyheter ordet rolle
      saker sommer starte svart synd tips amerikanske damer fine fokus gull hater
      moderne mor personlig raskt slått språk sterk tyskland unngå utvikling vist vold
      vondt angrep ber bok
    `),
  academicWords: words(`
      analyse struktur kontekst prosess fordeling tolkning bevis konsept kompleksitet morfologi kognitiv teori
      metode forskning argument perspektiv kategori prinsipp funksjon variabel antakelse konklusjon
    `),
  technicalWords: words(`
      elektroencefalografisk synkronisering tverrfaglig nevrofysiologi kontrarevolusjonær uforståelighet algoritme fonologi semantikk kryptografisk biokjemisk spektroskopi
      telekommunikasjon termodynamikk kalibrering transformasjon syntaks metadata
    `),
});

export const danishLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      og eller men at det den de en et i på med
      for af er som til om sig vi jeg du han hun
      ikke fra over under ved ind
    `),
  highFrequencyWords: words(`
      har der kan var skal vil også være hvor man hvis efter
      mig her hvad alle godt meget noget dig kunne lige min når
      blev bliver havde mere bare have dem lidt selv din mange vores
      får kun deres helt end kommer dag denne dette hans flere gør
      nok andre mod alt været blive god går igen fik hele sammen
      gang ville hvordan nye nogle skulle tid danmark dansk siden ham første
      sin gøre måske danske ingen siger sådan altid anden kom del uden
      ser andet fordi gerne nogen samme store tak blevet før mellem tilbage
      tror dog sidste arbejde brug dit finde tage hvorfor mit bedre hos
      lille ret stor bedste komme tre giver københavn mest stadig folk aldrig
    `),
  familiarWords: words(`
      ned både børn dine disse tager endnu set bruge gik hold mand
      nej samt ting fået gode hendes inden mine står give hvem omkring
      synes derfor først forskellige vej virkelig frem klar mennesker rigtig sige gange
      gennem hjem hver lide blandt faktisk par penge sted mens næste mindre
      måde tog død gamle hvilket verden altså ligger mener navn vel allerede
      dage liv aften findes grund hende sit tidligere elsker hjælp langt mænd
      plads side ellers finder kender lave holde morgen større ude stort vist
      haft kort længere tiden unge begge hjælpe jer nyt næsten væk ofte
      senere sine stedet ønsker betyder holder længe sagde sker gjorde jeres kvinder
      lang snart tale videre indtil lad spiller taget fire mål selvfølgelig sikkert
      største via bag bør gjort heller række spørgsmål bruger byen døde svært
      søn viser eneste fantastisk forhold hurtigt lavet mor ord rundt burde mad
      arbejder fem hej håber især timer fast film fundet gav gået høre
      kommune laver egen far glad hvert intet kører ligesom rigtigt virker aarhus
      hinanden måtte vide igennem kvinde ses uge brugt handler kommet købe lyder
    `),
  generalWords: words(`
      sidder tæt vigtigt billeder bruges danmarks dele fandt flot forbindelse form forstår
      historie møde sagt selvom familie fint fleste tænker usa valg alligevel hvilken
      imod problemer små stå sætte tur vejen dagen fejl følge læse personer
      slet således venner blot fortæller føler job kamp lov minutter samtidig tænke
      alene lade odense pige bog fald hjemme leder sikker skrevet søger engang
      hvornår live læs netop sætter barn fri køre landet livet løbet sjovt
      slags stille vand velkommen aalborg bad forbi hjemmeside hjælper hus skole spil
      spille steder datter dermed europa fuld høj muligt samarbejde svar sæson taler
      trods desuden desværre direkte gammel hen lyst lære medlemmer mindst new rigtige
      spændende tag bil endelig holdt hører land passer sat betale hedder klart
      mangler problem skrive stod venstre begynder bor inde john måneder nummer området
      resten seks sidst års bedst billede kræver marts område politiet prøve time
      uger ældre begyndte derefter foran forstå følger huset lande masse præcis tro
      verdens arbejdet danskere eksempel ifølge indenfor jorden kæmpe musik skriver tidspunkt uddannelse
      udvikling enkelte følgende givet millioner person spillet stop antal eget ene fodbold
      forældre hørt kendte maj masser nogensinde skat støtte året egne fedt fortælle
      gratis husk lange mening rejse råd samlet september ske vær egentlig familien
      fly gift kendt normalt nuværende plan politisk sag sagen super virksomheder aftale
      behøver fokus herunder hovedet
    `),
  uncommonWords: words(`
      huske højt kampen kæreste piger pris sender seneste stærkt uanset video vise
      dejligt hårdt let mulighed mærke peter slå april artikel blå fælles kalder
      kampe lever løb okay sende sendt sgu særlig tal valgt vidste værd
      baggrund bøger ekstra juni lars leve perfekt sex skolen spise tilfælde ønske
      bestemt dyr grad hånd højere kaffe københavns mio nødt sikre skabe sort
      spillere vinder vis yderligere årets dårlig fat gælder hvide højre kærlighed manden
      slog stand venter århus består brugte dårligt ende enkelt find gud helst
      love lærer løber meter offentlige starter sæt søde troede tøj vandt vinde
      afsnit forslag fortsat galt indeholder januar michael moderne politik stil stykke træk
      vente vigtig efterfølgende efterhånden enten erne forsøg født kommunen krig medlem nemt
      områder prøver rette samfund slået thomas tvivl årig angreb besøg formand ganske
      gruppe hvilke lys nemlig oktober regeringen røde skrev syv tyskland øjne august
      betydning ens færdig høje krav lokale lægger samlede særligt træt type ung
      vild you åbne ansvar bogen dens kære ondt periode politiske randers skete
      start virksomhed årige ændre økonomi børnene dræbt fest fin foregår forkert ligner
      måned overfor overhovedet pludselig point rent sommer sverige sød tænkte viste øje
      øvrigt bange data dejlig falder hey historien idé kigge klare kultur martin
      niveau prøv ringe sang sidde smuk succes top tør bilen forskel hår
      ide lader sad sikkerhed
    `),
  academicWords: words(`
      analyse struktur kontekst proces fordeling fortolkning bevis koncept kompleksitet morfologi kognitiv teori
      metode forskning argument perspektiv kategori princip funktion variabel antagelse konklusion
    `),
  technicalWords: words(`
      elektroencefalografisk synkronisering tværfaglig neurofysiologi kontrarevolutionær uforståelighed algoritme fonologi semantik kryptografisk biokemisk spektroskopi
      telekommunikation termodynamik kalibrering transformation syntaks metadata
    `),
});

export const portugueseLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      o a os as um uma uns umas e ou mas de
      do da em com por para é que se ao eu tu
      ele ela nós eles elas nos nas dos das
    `),
  highFrequencyWords: words(`
      não como mais foi você ser seu sua tem são muito isso
      também quando está meu pelo vai dia pela sobre bem até mesmo
      pode pessoas ter tudo ainda aqui fazer minha anos todos quem sem
      agora entre era seus assim depois este onde vou brasil mundo estão
      esse tempo vida essa porque tenho casa nada ver melhor bom foram
      sempre ano grande esta vez aos apenas coisa sou suas dois nunca
      todo quero mim parte outros hoje sei tão então nem nossa faz
      cidade qual deus quer estou trabalho durante estado forma novo pra seja
      dias maior outro primeiro será cada qualquer sim acho menos alguém antes
      coisas nome sendo desde diz falar sabe tinha contra dar boa estava
    `),
  familiarWords: words(`
      três alguns ficar mãe pouco rio segundo além disse noite nosso nova
      toda caso deve história podem vezes estar após duas grupo meio primeira
      tipo todas cara dizer paulo lado mulher outras enquanto fez ninguém outra
      momento vamos verdade vocês foto lugar nacional país presidente quanto saber sido
      volta for pelos algo conta família gente algumas fim final parece semana
      acordo hora jogo num pessoa têm através governo meus pai quase tanto
      dentro filho fora homem vem vídeo música pois preciso vão água disso
      fazendo horas janeiro poder dele direito mil muitos numa número dinheiro queria
      seria sistema amor escola frente mesma muitas tarde local morte segunda amigos
      brasileiro precisa projeto região sair sul temos teve área dela esses lei
      partir problema público site alguma comigo embora guerra centro deixar essas estamos
      fica filme havia importante logo mal sob geral lhe programa social vários
      certo equipe feito neste segurança terra estados exemplo falta favor série causa
      mulheres uso aquele brasileira crianças deste feira fosse isto milhões população posso
      quatro deu ficou nossos polícia processo usar ajuda cabeça cerca corpo desta
    `),
  generalWords: words(`
      fui meses problemas realmente tenha várias algum cinco desenvolvimento dessa grandes início
      livro medo passar relação tal ajudar amigo claro deles existe pelas atenção
      chegar desse fotos informações los muita norte política ponto possível quais quiser
      rede universidade apesar começou feliz gosto homens maneira nesse última difícil empresa
      estes fala força internet passado rua veja base dados demais eram especial
      internacional manhã nenhum olha pensar povo diferentes falando merda poderia pontos porém
      unidos atrás deixa futebol mês pessoal próprio saúde somos entanto maioria mão
      papel paz real talvez último acabou aconteceu chegou encontrar fazem federal forte
      fácil melhores minhas minutos outubro passa países produção sociedade voltar educação fato
      filhos fiz legal longo março passou sinto acesso aquela campo coração cultura
      estavam junho lista nenhuma pena portugal senhor viu certeza começar consigo espaço
      evento filha oficial ouvir palavras perto principal setembro vivo único alto apoio
      diferente entrar ideia junto levar maio nessa ontem porto própria serviço única
      agosto bastante jesus jovem livre língua nesta olhos pais período português seis
      situação sério time via acha amanhã caminho carro deveria dezembro energia festa
      novas nível questão respeito total vista abril acontece devido informação inglês irmão
      josé novembro objetivo partido plano podemos sociais sucesso trabalhar vale viver américa
      capital cima justiça linha membros mundial nossas presente professor quarto seguir tendo
      teu ali ação cidades
    `),
  uncommonWords: words(`
      copa criança estas grupos imagem jogos julho luz militar modo movimento novos
      ordem próximo tomar voz construção espero fevereiro futuro idade maria mudar obrigado
      vejo visto acredito baixo chega controle direitos empresas jeito principais principalmente pública
      resultado sala seguinte tradução valor chamado comprar conselho daqui edição encontro irá
      ler luta manter mensagem novamente obrigada organização palavra parar pergunta significa tentar
      teria tirar tua amo aqueles assunto central comum conseguir decisão devem faça
      houve joão maiores querem sentido sexo tecnologia texto época arte artigo casos
      comunidade criar igreja longe prova sentir vontade acima atual civil colocar errado
      existem incluindo livros obra olhar perder página somente usando abaixo conhecer dizendo
      gosta mostrar participação pedir posição possui sabia serviços super áreas achei continuar
      defesa deixou faço online original pequeno simples tive versão vitória acontecer boca
      canal carlos comunicação consegue contar feita ministério morrer pegar pior resultados terá
      veio boas campanha chefe comer conhecido continua câmara entender eventos mercado ministro
      mãos resposta serão sol tornou trata últimos busca conseguiu criação dez mostra
      pequena pesquisa recursos república santos show ambiente chama chamada diversas dizem europa
      finalmente ganhar morreu passo político portanto razão rei santa sexta simplesmente associação
      blog casamento começa data exército hospital humanos interesse locais motivo pagar realidade
      rápido serem tentando tribunal união viagem vir alta ambos aquilo banco condições
      conteúdo desses espera etc
    `),
  academicWords: words(`
      análise estrutura contexto processo distribuição interpretação evidência conceito complexidade morfologia cognitivo teoria
      método pesquisa argumento perspectiva categoria princípio função variável hipótese conclusão
    `),
  technicalWords: words(`
      eletroencefalográfico sincronização interdisciplinar neurofisiologia contrarrevolucionário incompreensibilidade algoritmo fonologia semântica criptográfico bioquímico espectroscopia
      telecomunicações termodinâmica calibração transformação sintaxe metadados
    `),
});

export const polishLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      i oraz ale czy że to ten ta te w na z
      do po za jest się nie od dla a o u ja
      ty on ona tym tego przez
    `),
  highFrequencyWords: words(`
      jak tak tylko już mnie może bardzo będzie być jego sobie ich
      mam jeśli roku też jeszcze był które jako jestem było jej kiedy
      który nawet teraz pod coś lat tam więc gdy gdzie tej bez
      żeby jednak lub wiem nic wszystko można przy ludzie przed więcej chyba
      ludzi nas także była tych również takie ktoś niż dobrze kto zawsze
      która właśnie masz sie aby albo osób czas mają dzięki którzy podczas
      bardziej dlaczego dzieci nich raz nad nigdy pracy mamy życie chce dnia
      innych jesteś temu tutaj wiele został będą jeden miejsce polski wszyscy wszystkich
      wszystkie były kilka nam sposób domu dzień których prostu razem siebie taki
      chodzi swoje trochę czasu dlatego każdy którym dwa miał moje mój naprawdę
    `),
  familiarWords: words(`
      polsce sam trzeba mieć mówi nim ciebie mogą mogę oni cię dalej
      dużo nikt stanie dziś której moja rzeczy strony życia kraju pierwszy jakie
      lepiej potem wtedy będę dni jaki osoby tyle cały ile moim najbardziej
      niego wielu czasie inne według czemu czym musi oczywiście swoją została zrobić
      świata czyli którego między niech proszę taka temat ani prawa później takich
      wszystkim dobry możesz pan pewnie czego często jeżeli nadal was jakiś polska
      poza dziękuję jakieś lata prawo rok dwóch jesteśmy dzisiaj kiedyś ponad zdjęcie
      część miasta prawie stronie swoich chcę jednym kurwa nowe pani powiedział problem
      samo takiego trzy wygląda chcesz film miała niej wcześniej świecie one swoim
      części gdyby końcu miejscu nowy ponieważ robi szybko dobra koniec obecnie pewno
      szkoły którą mimo możemy prawda nadzieję należy nasze około powodu przecież razy
      swojego wydaje byli dopiero jakby rozumiem sama swojej wieku wiesz bym celu
      historii jedna latach miejsca mojej wciąż wśród zbyt dwie muszę państwa pierwsze
      samym sprawie widzę większość dość kogoś powiedzieć robić słowa typu wam wie
      człowieka dokładnie myślę swój udział zdjęcia świat brak chociaż dobre grupy początku
    `),
  generalWords: words(`
      pytanie razie rodziny takim centrum danych drugiej jednego jedną każdym kilku maja
      mojego niestety znaczy życiu choć jedynie każdego natomiast pieniądze pomocy powinien usa
      wraz zaraz zostały związku człowiek dziecko mniej nasz naszych ostatnio partii pracę
      przypadku raczej rzecz znaleźć śmierci coraz czasem daj jedno kobiety skoro innego
      przykład sobą uwagę ważne chcą dzieje nią twoje zamiast informacji jednej końca
      różnych znowu zostało będziemy kobiet myśli nimi ogóle sprawy strona system sytuacji
      innymi moją nowego oznacza przeciwko przynajmniej rady ziemi inny naszego zarówno zmiany
      gra głównie innym istnieje lecz mieszkańców naszej poprzez wobec względu zostać źle
      drugi lubię moich podoba ramach rząd szczególnie twój warto wody wystarczy zostanie
      całe działa fakt informacje polskiego pomiędzy pomysł stało taką żadnych będziesz daje
      działania gdzieś inaczej mało minut osoba pomoc sprawa znajduje boże bądź długo
      grupa gry kolejny miasto miałem mieście naszym stronę wojny zobaczyć chwili ciągu
      marca musisz mógł pieniędzy powinno super ciekawe idzie jednocześnie jutro kultury mieli
      nocy pis pisze polskich problemy udało widać chciał dom iść jakoś jaką
      muszą mówią pierwszym projekt samego sprawę sumie trzech wiadomości zanim znam byłem
      całą czegoś firmy kobieta kocham musimy następnie nowych państwo podstawie polskiej program
      same wczoraj godzin godziny historia kim możliwe najlepiej oczy okazji polskie razu
      trudno września zgodnie klasy książki mocno najpierw nasza pana pokoju rano rozwoju
      różne skąd władzy byłoby
    `),
  uncommonWords: words(`
      cała ciągle czasami kogo miało mną mówić nowa nowym panie października pierwszej
      pomóc przede szkole wcale zależy całej całym cztery dane dać drogi inni
      jaka kolejne możliwości organizacji pamiętam prawdopodobnie prezydenta przepraszam szczęście terenie tys zdrowia
      zrobił zwłaszcza drodze imię kraj miesięcy ostatni praca stan stanu szkoda takiej
      twoja zupełnie czerwca jakim lutego mogli mówiąc obok ochrony oto pierwsza podobnie
      powinna rodzaju serio stycznia ustawy śmierć akcji chwilę czuję grudnia góry momencie
      nowej projektu pół warszawa warszawie byłam kościoła liczba postaci rodzina sami sieci
      spraw tez tymi ulicy zaczyna zdjęć badania europy kwietnia mama mówię nami
      niektórych prezydent ruchu stać telefon tysięcy tzw walki wszystkiego wyniki zjednoczonych zmienić
      żyć bezpieczeństwa całkiem ciała każda każdej listopada macie małe media mężczyzn systemu
      trakcie uwagi wartości zwykle całego ciężko gdyż głos kierunku miały nagle najlepszy
      niektórzy nikogo ojciec ostatnie pomocą poziom programu pytania rosji tydzień zespół znacznie
      brzmi chcemy duże głowy juz język miałam niektóre odpowiedzi policja ponownie rodzice
      sierpnia stylu uważam wielki zaś żadnego całkowicie celem dniu jasne kupić lipca
      możliwość nauki oprócz parę powiem powinni rynku tobie wiadomo wiec większości you
      dawno dziecka filmu francji gminy najlepsze pierwszego powinny prowadzi robią siły sytuacja
      widzisz wiedzieć zdecydowanie zobacz autor dostęp hej jakaś języka kościół miłość najmniej
      niby plan potrzebuje samej spokojnie twoim wyborach wyłącznie zdaniem znów chciałbym drugie
      kolei ludziom naszą polecam
    `),
  academicWords: words(`
      analiza struktura kontekst proces dystrybucja interpretacja dowód koncepcja złożoność morfologia poznawczy teoria
      metoda badanie argument perspektywa kategoria zasada funkcja zmienna założenie wniosek
    `),
  technicalWords: words(`
      elektroencefalograficzny synchronizacja interdyscyplinarny neurofizjologia kontrrewolucyjny niezrozumiałość algorytm fonologia semantyka kryptograficzny biochemiczny spektroskopia
      telekomunikacja termodynamika kalibracja transformacja składnia metadane
    `),
});

export const swedishLexiconSeed = createLexiconSeedBundle({
  functionWords: words(`
      och eller men att det den de en ett i på med
      för av är som till om sig vi jag du han hon
      inte från över under vid här
    `),
  highFrequencyWords: words(`
      har kan man var ska när vad mig bara hur kommer alla
      vill vara där får bra finns skulle min dig hade lite mycket
      upp gör blir mer efter göra detta också allt måste går även
      någon vet andra något tror bli mot kanske ser ingen sverige två
      varför många dem din hela sen sin helt utan väl fick oss
      säger aldrig varit mitt blev rätt dom sedan själv behöver några svenska
      första nog tar tycker alltid bättre denna igen tack just idag nej
      folk inget kom del säga innan ner barn mina samma borde dag
      verkligen nya sätt vilket annat tid genom hans fel gång känner bort
      mellan riktigt varje vår dessa ens hem komma precis sina gick sitt
    `),
  familiarWords: words(`
      väldigt ändå gjort fram kunna människor redan bästa dock inga inom håller
      kunde ditt fått gjorde olika ganska honom står tillbaka vem ger länge
      mindre runt stor deras fortfarande ligger sett tre vilken enligt flera lika
      saker stockholm svensk tiden förstår känns liv mest våra alltså annan jävla
      pengar faktiskt män bland enda fler jobb längre personer samt tog dina
      gillar menar stora därför hos kvar kvinnor typ tänker börjar eftersom problem
      större tidigare fall fråga hoppas fast först hitta såg verkar blivit istället
      svårt älskar nån gärna haft nästan både gäller klart låter nästa plats
      vilka världen hemma hålla hjälp kul ofta per sluta ute henne snart
      ännu börja försöker händer ibland liten namn kolla sista sitter vissa emot
      ihop visst all direkt gott helst sagt sak senare tillsammans dagen död
      köpa stort största sveriges ville egen gånger gått kör livet långt polisen
      samtidigt usa dagar hennes landet lätt okej skall säkert tills åka annars
      bör handlar heller läsa ord slut spelar vårt gamla mamma nära skolan
      tag dessutom egentligen exempel god låt senaste tänka veta visar väg vänner
    `),
  generalWords: words(`
      båda tro trots visa använda började enkelt fyra gången jobbar par skriva
      skriver tyvärr vart bäst ifrån lägga nytt pratar sex skit trodde tänkte
      endast hej mat själva timmar tänk alls bakom betyder dra fanns prata
      tur vidare bor hand hjälpa person spela via dess hittar igenom sånt
      utanför viktigt använder dit jobbet kvinna lär nåt varandra äta bild egna
      högre hör intressant jobba massa minuter tagit vilja dags grund snälla frågan
      frågor göteborg igår inför känna land lära stå svar sätta vägen företag
      kommit kort roligt vecka åker bil brukar före försöka lilla lång malmö
      möjligt politiker sidan vore absolut betala början dåligt förra glad helvete låta
      medan minst talet delar fem heter höra kväll lag lyssna mål titta
      fint hört otroligt flesta hit sida skrev veckan året haha ingenting innebär
      kring lever miljoner månader pappa självklart snabbt val följa förstå köra sant
      skicka söker håll inne leva lägger satt sitta tyckte vanligt vänta arbete
      exakt fattar film fin fort framför följer föräldrar hel hjälper läs spel
      spelare tjejer undrar öppna extra fungerar gammal gud hus hög kommun liksom
      lämna minns särskilt sån totalt behöva bilden bilder dagens drar illa morgon
      någonsin små vatten veckor äldre åren behövs form låg poäng stöd vän
      bryr ihåg imorgon kallar mår roll rum välja antal dålig eget fina
      fortsätta full historia klara
    `),
  uncommonWords: words(`
      skönt sätter träffa visste huvudet klockan oavsett samhälle säker unga väntar används
      gav hårt igång kalla kille läser ses stan tjej väljer borta familj
      flytta funkar klarar konstigt perfekt regeringen tänkt världens äter barnen bilen familjen
      förutom hittade hänt länder saknar ungefär värre önskar berätta engelska finnas fortsätter
      försök goda ikväll musik problemet resten speciellt stämmer talar välkommen alldeles ansvar
      beslut gratis hatar läst ont råd sjukt son svara sådan delen dör
      ensam förslag hände media människa new räcker slutet ställa tydligen års europa
      fullt internet killar kompis någonting området pengarna pga stod synd tanke trött
      övrigt antar filmen fri kallas klar lärare månad passar resa skapa slå
      spännande tio tips tredje uppsala vann antalet chans information knappt kände köper
      ned riktig samhället sova tillräckligt anledning grupp högt iväg john kronor plötsligt
      rör skola stad utbildning vita börjat främst förbi förklara kräver kärlek köpte
      leder nyheter skillnad slår tittar värt ytterligare äntligen bok bygga däremot försökte
      jobbat kaffe krävs lycka lyckas lägg lämnar norge oftast plan ryssland stark
      trevligt vänster övriga beror berättar betalar dela era iaf mannen omkring reda
      rädd slutar staden säg vinna brott byta därmed döda finland framtiden frågar
      förr hända kläder politik resultat rädda skrivit steg tala fantastiskt huset hälsa
      höll krav kvällen ligga liknande meter natt osv sker stället tidigt trevlig
      vanliga alternativ anser artikel
    `),
  academicWords: words(`
      analys struktur kontext process fördelning tolkning bevis koncept komplexitet morfologi kognitiv teori
      metod forskning argument perspektiv kategori princip funktion variabel antagande slutsats
    `),
  technicalWords: words(`
      elektroencefalografisk synkronisering tvärvetenskaplig neurofysiologi kontrarevolutionär obegriplighet algoritm fonologi semantik kryptografisk biokemisk spektroskopi
      telekommunikation termodynamik kalibrering transformation syntax metadata
    `),
});

