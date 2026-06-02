function validarLuhn(numero) {
    let suma = 0;
    let salteo = false;
    let result;

    for(let i = numero.length-1; i>=0; i--){
        let n = Number(numero[i]);
        if (salteo === true) {
            n = n * 2;
            if (n > 9) {
                n = n - 9;
            }
        }
        suma = suma + n;
        if(salteo == false){
            salteo = true;
        }else{
            salteo = false;
        }
        //salteo = !salteo
    }
    result = (suma % 10 === 0);
    return result;
}

const botonValidar = document.getElementById("btnValidar");

botonValidar.addEventListener("click", ()=>{
    const numero = document.getElementById("inpNum").value;
    const resultado = document.getElementById("resultado");

    if (validarLuhn(numero)) {
        resultado.textContent = "Numero Valido";
        resultado.classList.remove("invalido");
        resultado.classList.add("valido");
    } else{
        resultado.textContent = "Numero Invalido";
        resultado.classList.remove("valido");
        resultado.classList.add("invalido");
    }
});