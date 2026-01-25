Output refactor-walkthrough.gif
Set FontSize 14
Type `echo "Quick scaffold: from empty folder to tidy project."`
Enter
Sleep 800ms
Type `echo "We will create folders, boilerplate files, and take a short tour."`
Enter
Sleep 800ms
Type `ls`
Enter
Sleep 1s
Type `pwd`
Enter
Sleep 1s
Type `ls -a`
Enter
Sleep 1s
Type `mkdir project-sandbox`
Enter
Sleep 500ms
Type `cd project-sandbox`
Enter
Sleep 500ms
Type `mkdir src`
Enter
Sleep 400ms
Type `mkdir docs`
Enter
Sleep 400ms
Type `mkdir scripts`
Enter
Sleep 400ms
Type `mkdir assets`
Enter
Sleep 400ms
Type `cd src`
Enter
Sleep 400ms
Type `ls`
Enter
Sleep 600ms
Type `cd ..`
Enter
Sleep 300ms
Type `cd docs`
Enter
Sleep 400ms
Type `ls`
Enter
Sleep 600ms
Type `cd ..`
Enter
Sleep 300ms
Type `cd scripts`
Enter
Sleep 400ms
Type `ls`
Enter
Sleep 600ms
Type `cd ..`
Enter
Sleep 300ms
Type `cd assets`
Enter
Sleep 400ms
Type `ls`
Enter
Sleep 600ms
Type `cd ..`
Enter
Sleep 300ms
Type `echo "Now creating boilerplate files."`
Enter
Sleep 800ms
Type `cat <<'EOF' > .gitignore`
Enter
Type `node_modules`
Enter
Type `.DS_Store`
Enter
Type `dist`
Enter
Type `EOF`
Enter
Sleep 400ms
Type `cat <<'EOF' > README.md`
Enter
Type `# Project Sandbox`
Enter
Type `A tiny scaffold for pre-vhs demos.`
Enter
Type `EOF`
Enter
Sleep 400ms
Type `cat <<'EOF' > docs/quickstart.md`
Enter
Type `# Quickstart`
Enter
Type `- Run scripts/dev.sh`
Enter
Type `- Add real code in src/`
Enter
Type `EOF`
Enter
Sleep 400ms
Type `cat <<'EOF' > scripts/dev.sh`
Enter
Type `#!/usr/bin/env bash`
Enter
Type `echo "dev script placeholder"`
Enter
Type `EOF`
Enter
Sleep 400ms
Type `chmod +x scripts/dev.sh`
Enter
Sleep 400ms
Type `cat <<'EOF' > assets/.keep`
Enter
Type `EOF`
Enter
Sleep 400ms
Type `echo "Adding sample content."`
Enter
Sleep 800ms
Type `cat <<'EOF' > src/main.txt`
Enter
Type `hello from src`
Enter
Type `this is placeholder text`
Enter
Type `EOF`
Enter
Sleep 400ms
Type `cat <<'EOF' > docs/notes.md`
Enter
Type `- remember to update README`
Enter
Type `- add tests later`
Enter
Type `EOF`
Enter
Sleep 400ms
Type `echo "Quick tour of the scaffold."`
Enter
Sleep 800ms
Type `ls`
Enter
Sleep 600ms
Type `ls -a`
Enter
Sleep 600ms
Type `find . -maxdepth 2 -type f`
Enter
Sleep 1s
Type `cat README.md`
Enter
Sleep 800ms
Type `cat docs/quickstart.md`
Enter
Sleep 800ms
Type `cat scripts/dev.sh`
Enter
Sleep 800ms
Type `cat src/main.txt`
Enter
Sleep 800ms
Type `echo "Scaffold complete."`
Enter
