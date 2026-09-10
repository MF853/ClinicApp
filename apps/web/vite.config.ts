import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{target:['safari15','chrome89','firefox115']},server:{port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:3000'}}}});
