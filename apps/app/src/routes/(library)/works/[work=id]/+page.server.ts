// import { createContext } from '$lib/trpc/context';
// import { router } from '$lib/trpc/router';
// import { error } from '@sveltejs/kit';
// import type { PageServerLoad } from './$types';
//
// export const load: PageServerLoad = async ( event ) => {
//   const caller       = router.createCaller( await createContext( event ) );
//   const { book: id } = event.params;
//
//   try {
//     const book     = await caller.books.load( id );
//
//     return { book };
//   } catch {
//     throw error( 404, 'Book not found' );
//   }
// };
