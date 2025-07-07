import type { ContributionRole } from "@colibri-hq/sdk/schema";
import {
  createAsset,
  createContribution,
  createCreator,
  createEdition,
  createImage,
  createPublisher,
  createWork,
  type Database,
  findCreatorByName,
  findPublisherByName,
  loadLanguage,
  updateWork,
} from "@colibri-hq/sdk";
import { loadMetadata } from "@colibri-hq/sdk/ebooks";
import { encodeImageToBlurHash, parseExif, parseXmp } from "@colibri-hq/shared";
import { Args } from "@oclif/core";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import sharp from "sharp";
import { BaseCommand } from "../../command.ts";

export default class Add extends BaseCommand<typeof Add> {
  static override args = {
    file: Args.file({
      description: "The file to add",
      exists: true,
      name: "file",
      required: true,
    }),
  };
  static override description = "Add a work to Colibri";
  static override examples = [
    {
      command: "<%= config.bin %> <%= command.id %> some-file.epub",
      description: "Create a work from 'some-file.epub'",
    },
  ];

  public async run() {
    const { database } = this.instance;
    const { file: path } = this.args;
    const buffer = await readFile(path);
    const file = new File([buffer], basename(path));
    const {
      contributors,
      cover: coverImage,
      datePublished,
      identifiers,
      language: languageCode,
      legalInformation,
      numberOfPages,
      properties,
      sortingKey,
      synopsis,
      title,
    } = await loadMetadata(file);
    const coverInfo = coverImage ? await loadCover(coverImage) : undefined;

    // TODO: [ ] Check if the edition already exists in the database
    // TODO: [ ]   If yes, check if the asset format already exists on storage
    // TODO: [ ]     If yes, prompt the user to skip or overwrite the existing book
    // TODO: Upload book ([x]) and cover ([x]) to the storage bucket
    // TODO: [x] Create an asset record for the book file
    // TODO: [x] Create an image record for the cover
    // TODO: [x] Link the cover file to the image record
    // TODO: [x] Link the asset to the edition record

    await database.transaction().execute(async (trx) => {
      // region Creators
      const publishers = new Set<string>();
      const contributions = new Map<ContributionRole, string[]>();

      for (const { name, roles, sortingKey } of contributors ?? []) {
        if (roles.includes("bkp") || roles.includes("pbl")) {
          const { id } = await findOrCreatePublisher(trx, name, sortingKey);
          publishers.add(id);

          continue;
        }

        const { id } = await findOrCreateCreator(trx, name, sortingKey);

        for (const role of roles) {
          if (!contributions.has(role)) {
            contributions.set(role, []);
          }

          contributions.get(role)?.push(id);
        }
      }
      // endregion

      // region Cover
      const cover =
        coverImage && coverInfo
          ? await createImage(
              trx,
              new File([coverImage], `${title}.${coverInfo.format}`, {
                type: coverInfo.format,
              }),
              {
                blurhash: await generateBlurhash(coverImage),
                height: coverInfo.height,
                metadata: coverInfo.metadata,
                width: coverInfo.width,
              },
            )
          : undefined;
      // endregion

      // region Book and Edition
      // TODO: Handle other identifier types, such as "uri", "uuid", etc.
      const isbn = identifiers?.find(({ type }) => type === "isbn")?.value;
      const asin = identifiers?.find(({ type }) => type === "asin")?.value;

      let work = await createWork(this.instance.database);
      const language = languageCode
        ? (await loadLanguage(database, languageCode))?.iso_639_3
        : undefined;
      const edition = await createEdition(trx, work.id, {
        asin,
        coverId: cover?.id,
        isbn,
        language,
        legalInformation: legalInformation,
        pages: numberOfPages,
        publishedAt: datePublished,

        // TODO: Right now, we only support one publisher per edition. This might be a flawed
        //       assumption, however.
        publisherId: publishers.values().toArray().shift(),
        sortingKey: sortingKey,
        synopsis,
        title: title ?? "Untitled",
      });

      // Update the work with the main edition ID
      work = await updateWork(trx, work.id, edition.id);

      await createAsset(trx, file, edition.id, {
        // TODO: These are empty currently
        metadata: { properties },
      });
      // endregion

      // region Contributions
      const persistedContributions = [];

      for (const [role, creatorIds] of contributions.entries()) {
        for (const creatorId of creatorIds) {
          persistedContributions.push(
            await createContribution(
              trx,
              creatorId,
              edition.id,
              role,
              role === "aut",
            ),
          );
        }
      }
      // endregion

      console.log(
        `Added work "${title}" with ID ${work.id} and edition ID ${edition.id}`,
        {
          contributors,
          cover,
          edition,
          persistedContributions,
          publishers,
          work,
        },
      );
    });
  }
}

async function findOrCreatePublisher(
  database: Database,
  name: string,
  sortingKey: string | undefined = name,
) {
  return (
    (await findPublisherByName(database, name)) ??
    (await createPublisher(database, name, { sortingKey }))
  );
}

async function findOrCreateCreator(
  database: Database,
  name: string,
  sortingKey: string | undefined = name,
) {
  return (
    (await findCreatorByName(database, name)) ??
    (await createCreator(database, name, { sortingKey }))
  );
}

async function loadCover(file: Blob | File) {
  const bytes = await file.bytes();
  const image = sharp(bytes, {});
  const {
    exif: exifData,
    format,
    height,
    orientation,
    size,
    width,
    xmp: xmpData,
  } = await image.metadata();
  let metadata = {} as Record<string, unknown>;

  if (exifData) {
    const { GPSInfo, Image, Photo } = parseExif(exifData);

    metadata = {
      ...metadata,
      ...Image,
      ...Photo,
      ...GPSInfo,
    };
  }

  if (xmpData) {
    const { dc, pdf, photoshop, xmp } = parseXmp(xmpData.buffer);

    metadata = {
      ...metadata,
      ...dc,
      ...xmp,
      ...pdf,
      ...photoshop,
    };
  }

  return {
    format,
    height,
    metadata,
    orientation,
    size,
    width,
  };
}

async function generateBlurhash(coverImage: Blob | File) {
  const bytes = await coverImage.bytes();
  const {
    data,
    info: { height, width },
  } = await sharp(bytes)
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });

  return await encodeImageToBlurHash(new Blob([data]), {
    height,
    width,
  });
}
