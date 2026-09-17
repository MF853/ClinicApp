import {spawn} from 'node:child_process';
const build=spawn('npm',['run','build','-w','@clinic/backend'],{stdio:'inherit'});
build.on('exit',code=>{if(code)process.exit(code);const child=spawn('npx',['--no-install','concurrently','--kill-others','-n','types,api,worker,web','npm run dev -w @clinic/backend','node --watch --env-file=.env backend/dist/main.js','node --watch --env-file=.env backend/dist/worker.js','npm run dev -w @clinic/web'],{stdio:'inherit'});process.on('SIGINT',()=>child.kill('SIGINT'));child.on('exit',code=>process.exit(code??1));});
