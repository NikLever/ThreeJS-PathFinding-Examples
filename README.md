# ThreeJS-PathFinding-Examples

![pathfinding](www/assets/pathfinding.jpg)

A common problem in many 3d games, is restraining the players avatar to the environment. So a player appears to be on the floor and can't walk through walls and other obstructions. A popular method is to use a **Navigation Mesh**, abbreviated as **NavMesh**. When using the [**Three.JS**](https://threejs.org) library, you'll need to create a NavMesh then use code to use this mesh to restrict movement. Until Blender 2.79b you could use the Blender Game Engine to create a NavMesh. Since [**Blender 2.8**](https://blender.org) this has not been possible. In this tutorial I show you how you can use **Unity** and a **custom exporter** script to create the NavMesh. Then you can import this into Blender. Tweak it and export it as a GLB file to load into your Three.JS app. 
Then using a library it is possible to use the NavMesh to **generate paths** around the mesh.

Download the repo, then follow the [**YouTube links**](https://www.youtube.com/playlist?list=PLFky-gauhF47XkxyjKuVaetZyt02PMujv) below to learn how to create and use a NavMesh to control the motion of an avatar.

## YouTube
- [Creating a NavMesh](https://www.youtube.com/watch?v=3CYljFpF4ds)
Learn how to use Unity and Blender to create a NavMesh
- [Using a NavMesh](https://www.youtube.com/watch?v=6P1tbSFalI0)
Learn how to use [Don McCurdy's](https://github.com/donmccurdy) [Pathfinding library](https://github.com/donmccurdy/three-pathfinding) and Three.JS to constrain an avatar to a NavMesh

## Live examples
- [Simple](https://niklever.github.io/three/pathfinding/simple/)
- [Complex](https://niklever.github.io/three/pathfinding/dungeon/)

## Links
- [My courses](http://niklever.com/courses)
- ![icon](www/assets/facebook.png)[FB Three.JS Group](https://www.facebook.com/groups/nikthreejs)
- ![icon](www/assets/twitter.png)[Twitter](https://twitter.com/NikLever)
- ![icon](www/assets/youtube.png)[YouTube Channel](https://www.youtube.com/channel/UCUlSAoLd9N2AEeT08wqnpyg?view_as=subscriber)
- ![icon](www/assets/mail.png)[nik.j.lever@gmail.com](mailto:nik.j.lever@gmail.com)
