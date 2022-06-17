#!/usr/bin/env zx

import crypto from 'crypto';

const baseurl = 'https://cdn.helgesson.dev';
const minioName = 's3';
const bucket = 'img';

const key = crypto.randomBytes(6).toString('hex');

const tempFile = `/tmp/${key}.png`;

const imgUrl = `${baseurl}/${bucket}/${key}.png`;

await which('notify-send').catch(() => {
    console.error('notify-send not found. Please install notify-send.');
    process.exit(1);
});

await which('flameshot').catch(async () => {
    console.error(chalk.red`Flameshot not found. Please install flameshot.`);
    await quiet($`notify-send "Screenshotter | Error" "Flameshot not found. Please install flameshot." --app-name="Flameshot" --expire-time=500`);
    process.exit(1);
});

await which('mcli').catch(async () => {
    console.error('Minio Client not found. Please install mcli.');
    await quiet($`notify-send "Screenshotter | Error" "Minio Client not found. Please install mcli." --app-name="Flameshot" --expire-time=500`);
    process.exit(1);
});

const data = await quiet($`flameshot gui -c -p ${tempFile}`);
if (data.stderr.includes('aborted')) {
    await quiet($`notify-send "Screenshotter" "Capture aborted" --app-name="Flameshot" --expire-time=500`);
    console.error(chalk.red(data));
    process.exit(1);
}

await $`mcli cp ${tempFile} ${minioName}/${bucket}`;

await quiet($`echo -n ${imgUrl}| xsel -ib`);

await quiet($`notify-send "Screenshotter | Uploaded" ${imgUrl} --app-name="Flameshot" --expire-time=500`);

await $`rm ${tempFile}`;


