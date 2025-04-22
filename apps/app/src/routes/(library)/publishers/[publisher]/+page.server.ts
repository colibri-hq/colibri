// import { createContext } from '$lib/trpc/context';
// import { router } from '$lib/trpc/router';
// import type { Author } from '@prisma/client';
// import { error } from '@sveltejs/kit';
// import type { PageServerLoad } from './$types';
//
// export const load: PageServerLoad = async ( event ) => {
// 	const caller            = router.createCaller( await createContext( event ) );
// 	const { publisher: id } = event.params;
//
// 	try {
// 		const publisher = await caller.publishers.load( id );
// 		const authors   = Object.values(
// 			publisher.books
// 							 .map( ( book ) => book.author )
// 							 .reduce( ( carry, author ) => {
// 								 if ( author && !( author.id in carry ) ) {
// 									 carry[ author.id ] = author;
// 								 }
//
// 								 return carry;
// 							 }, {} as Record<string, Author> )
// 		);
//
// 		return {
// 			publisher,
// 			authors
// 		};
// 	} catch {
// 		throw error( 404, 'Publisher not found' );
// 	}
// };

export {};
