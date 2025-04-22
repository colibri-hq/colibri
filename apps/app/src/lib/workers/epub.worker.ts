// // import { resolveFileType } from '$lib/epub/fileTypes';
// // import type { EpubFile, Metadata } from '$lib/epub/parser';
// // import { parse } from '$lib/epub/parser';
// import {
// 	createStreamFromArrayBuffer,
// 	encodeImageToBlurHash,
// 	getImageDimensions
// } from '$lib/utilities';
// import type { WorkerMessage } from '$lib/workers/workers';
// import { TextWriter, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
//
// onmessage = async ( { data }: MessageEvent<WorkerMessage<any>> ) => {
// 	switch ( data.type ) {
// 		case 'file':
// 			await handleFile( data.payload );
// 			break;
//
// 		default:
// 			console.log( `Unhandled message type ${ data.type }` );
// 	}
// };
//
// async function handleFile( payload: FileRequest ) {
//
// 	// Make sure to have a readable stream instance in all browsers - Safari tends
// 	// to misbehave
// 	const stream = payload.content instanceof ArrayBuffer
// 								 ? createStreamFromArrayBuffer( payload.content )
// 								 : payload.content;
//
// 	// Read the EPUB ZIP archive from the data stream
// 	const reader = new ZipReader( stream );
//
// 	// Convert all entries in the archive into a format the EPUB parser can parse
// 	const entries = await Promise.all( ( await reader.getEntries() ).map(
// 			async ( entry ): Promise<EpubFile> => ( {
// 				...entry,
// 				lastModified: entry.lastModDate.getTime(),
// 				size: entry.uncompressedSize,
// 				name: entry.filename,
// 				text: () => entry.getData( new TextWriter() ),
// 				arrayBuffer: () => entry.getData( new Uint8ArrayWriter() ).then( d => d.buffer ),
// 				type: 'application/octet-stream'
// 			} )
// 		)
// 	);
//
// 	const { metadata, coverFile }     = await parse( entries );
// 	let cover: FileResponse["cover"] | undefined;
// 	let transferables: Transferable[] = [];
//
// 	if ( typeof coverFile !== 'undefined' ) {
// 		const data = await coverFile.arrayBuffer();
// 		transferables.push( data );
//
// 		const { width, height }      = await getImageDimensions( data )
// 		const type                   = ( await resolveFileType( data ) )?.mime || 'application/octet-stream';
// 		let hash: string | undefined = undefined;
//
// 		if ( payload.canvas ) {
// 			const context = payload.canvas.getContext( '2d' ) as OffscreenCanvasRenderingContext2D;
// 			hash          = await encodeImageToBlurHash( data, context );
// 		}
//
// 		cover = { data, type, hash, width, height }
// 	}
//
// 	postMessage( {
// 		type: 'file',
// 		payload: {
// 			metadata,
// 			cover
// 		}
// 	}, { transfer: transferables } );
// }
//
// export interface FileRequest
// {
// 	name: string;
// 	lastModified: Date;
// 	size: number;
// 	type: string;
// 	content: ReadableStream<Uint8Array> | ArrayBuffer;
// 	canvas?: OffscreenCanvas;
// }
//
// export interface FileResponse
// {
// 	cover?: {
// 		data: ArrayBuffer;
// 		type: string;
// 		width: number;
// 		height: number;
// 		hash?: string;
// 	};
// 	metadata: Metadata;
// }
//
// export interface FileRequestMessage extends WorkerMessage<FileRequest>
// {
// 	type: 'file';
// }
//
// export interface BookResponseMessage extends WorkerMessage<FileResponse>
// {
// 	type: 'file';
// }

export default {};
