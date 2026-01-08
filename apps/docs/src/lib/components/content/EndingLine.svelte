<script lang="ts">
  const lines = [
    {
      line: 'He loved Big Brother.',
      caption: 'George Orwell, 1984',
    },
    {
      line: 'So we beat on, boats against the current, borne back ceaselessly into the past.',
      caption: 'F. Scott Fitzgerald, The Great Gatsby',
    },
    {
      line: 'Anne’s diary ends here.',
      caption: 'Anne Frank, The Diary of a Young Girl',
    },
    {
      line: 'But see how fast the smoke rises—oh, even faster when we laugh, lifting our hopes, higher and higher.',
      caption: 'Amy Tan, The Kitchen God’s Wife',
    },
    {
      line: 'Yet what is any ocean but a multitude of drops?',
      caption: 'David Mitchell, Cloud Atlas',
    },
    {
      line: 'Isn\'t it pretty to think so?',
      caption: 'Ernest Hemingway, The Sun Also Rises',
    },
    {
      line: 'All was well.',
      caption: 'J.K. Rowling, Harry Potter and the Deathly Hallows',
    },
    {
      line: 'It was a fine cry—loud and long—but it had no bottom and it had no top, just circles and circles of sorrow.',
      caption: 'Toni Morrison, Sula',
    },
    {
      line: 'There is a land of the living and a land of the dead, and the bridge is love, the only survival, the only meaning.',
      caption: 'Thornton Wilder, The Bridge of San Luis Rey',
    },
    {
      line: '\'Well, I\'m back,\' he said.',
      caption: 'J.R.R. Tolkien, The Return of the King',
    },
    {
      line: 'And I finally began like this: When I stepped out into the bright sunlight from the darkness of the movie house, I had only two of things on my mind: Paul Newman and a ride home…',
      caption: 'S.E. Hinton, The Outsiders',
    },
    {
      line: 'I just waited a bit, then turned back to the car, to drive off to wherever it was I was supposed to be.',
      caption: 'Kazuo Ishiguro, Never Let Me Go',
    },
    {
      line: 'The eyes and the faces all turned themselves toward me, and guiding myself by them, as by a magical thread, I stepped into the room.',
      caption: 'Sylvia Plath, The Bell Jar',
    },
    {
      line: 'In the deep glens where they lived all things were older than man and they hummed of mystery.',
      caption: 'Cormac McCarthy, The Road',
    },
    {
      line: 'We lie there together, watching the lightning and listening to the thunder, and waiting for the beginning of a rainy dawn.',
      caption: 'Marie Lu, Legend',
    },
    {
      line: 'She opened the door wide and let him into her life again.',
      caption: 'Stieg Larsson, The Girl Who Kicked the Hornet\'s Nest',
    },
    {
      line: 'How wild it was, to let it be.',
      caption: 'Cheryl Strayed, Wild',
    },
  ] satisfies { line: string; caption: string }[];
  const { line, caption } = $derived(lines[Math.floor(Math.random() * lines.length)]!);
</script>

<figure class="text-center">
  <blockquote class="text-sm text-gray-500 dark:text-gray-400 font-serif">
    <p>&ldquo;{line}&rdquo;</p>
  </blockquote>
  <figcaption class="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">
    &mdash;&thinsp;{caption}
  </figcaption>
</figure>
